
(function (global) {
    'use strict';

    var M = global.Mishkah || {};
    var React = M.React || {};

    function startsWithES5(str, prefix) {
        if (str == null || prefix == null) return false;
        return String(str).indexOf(String(prefix)) === 0;
    }

    // ===================================================================
    // JSX Tokenizer
    // ===================================================================

    var TOKEN_TYPES = {
        JSX_OPEN: 'JSX_OPEN',           // <div
        JSX_CLOSE: 'JSX_CLOSE',         // </div>
        JSX_SELF_CLOSE: 'JSX_SELF_CLOSE', // />
        JSX_TAG_END: 'JSX_TAG_END',     // >
        JSX_ATTR: 'JSX_ATTR',           // name="value" or name={expr}
        JSX_SPREAD: 'JSX_SPREAD',       // {...props}
        JSX_TEXT: 'JSX_TEXT',           // text content
        JSX_EXPR: 'JSX_EXPR',           // {expression}
        JSX_COMMENT: 'JSX_COMMENT',     // {/* comment */}
        JSX_FRAGMENT: 'JSX_FRAGMENT',   // <> or </>
        JS_CODE: 'JS_CODE'              // JavaScript code
    };

    /**
     * Tokenize JSX into a stream of tokens
     */
    function tokenizeJSX(code) {
        var tokens = [];
        var i = 0;
        var len = code.length;
        var inJSX = false;
        var jsxDepth = 0;

        while (i < len) {
            var char = code[i];

            // Check for JSX start
            if (char === '<' && !inString(code, i)) {
                var peek = code[i + 1];

                // Fragment: <>
                if (peek === '>') {
                    tokens.push({ type: TOKEN_TYPES.JSX_FRAGMENT, value: '<>', pos: i });
                    i += 2;
                    inJSX = true;
                    jsxDepth++;
                    continue;
                }

                // Closing tag: </
                if (peek === '/') {
                    // Check if fragment: </>
                    if (code[i + 2] === '>') {
                        tokens.push({ type: TOKEN_TYPES.JSX_FRAGMENT, value: '</>', pos: i });
                        i += 3;
                        jsxDepth--;
                        if (jsxDepth === 0) inJSX = false;
                        continue;
                    }

                    // Regular closing tag: </TagName>
                    var closeMatch = code.substring(i).match(/^<\/([a-zA-Z][\w.-]*)\s*>/);
                    if (closeMatch) {
                        tokens.push({
                            type: TOKEN_TYPES.JSX_CLOSE,
                            value: closeMatch[1],
                            pos: i
                        });
                        i += closeMatch[0].length;
                        jsxDepth--;
                        if (jsxDepth === 0) inJSX = false;
                        continue;
                    }
                }

                // Opening tag: <TagName
                var openMatch = code.substring(i).match(/^<([a-zA-Z][\w.-]*)/);
                if (openMatch) {
                    tokens.push({
                        type: TOKEN_TYPES.JSX_OPEN,
                        value: openMatch[1],
                        pos: i
                    });
                    i += openMatch[0].length;
                    inJSX = true;
                    jsxDepth++;

                    // Parse attributes
                    i = parseAttributes(code, i, tokens);
                    continue;
                }
            }

            // If inside JSX, parse JSX content
            if (inJSX && jsxDepth > 0) {
                // Check for expression: {expr}
                if (char === '{') {
                    var exprEnd = findMatchingBrace(code, i);
                    var expr = code.substring(i + 1, exprEnd);

                    // Check if comment: {/* */}
                    if (startsWithES5(expr.trim(), '/*')) {
                        tokens.push({
                            type: TOKEN_TYPES.JSX_COMMENT,
                            value: expr,
                            pos: i
                        });
                    } else {
                        tokens.push({
                            type: TOKEN_TYPES.JSX_EXPR,
                            value: expr,
                            pos: i
                        });
                    }
                    i = exprEnd + 1;
                    continue;
                }

                // Text content
                var textStart = i;
                while (i < len && code[i] !== '<' && code[i] !== '{') {
                    i++;
                }
                if (i > textStart) {
                    var text = code.substring(textStart, i);
                    if (text.trim()) {
                        tokens.push({
                            type: TOKEN_TYPES.JSX_TEXT,
                            value: text,
                            pos: textStart
                        });
                    }
                    continue;
                }
            }

            // Regular JavaScript code
            var jsStart = i;
            while (i < len && code[i] !== '<') {
                // Skip strings
                if (code[i] === '"' || code[i] === "'" || code[i] === '`') {
                    i = skipString(code, i);
                }
                i++;
            }
            if (i > jsStart) {
                var jsCode = code.substring(jsStart, i);
                if (jsCode.trim()) {
                    tokens.push({
                        type: TOKEN_TYPES.JS_CODE,
                        value: jsCode,
                        pos: jsStart
                    });
                }
            }
        }

        return tokens;
    }

    /**
     * Parse attributes within a JSX tag
     */
    function parseAttributes(code, startPos, tokens) {
        var i = startPos;
        var len = code.length;

        while (i < len) {
            var char = code[i];

            // Skip whitespace
            if (/\s/.test(char)) {
                i++;
                continue;
            }

            // Self-closing: />
            if (char === '/' && code[i + 1] === '>') {
                tokens.push({ type: TOKEN_TYPES.JSX_SELF_CLOSE, value: '/>', pos: i });
                return i + 2;
            }

            // Tag end: >
            if (char === '>') {
                tokens.push({ type: TOKEN_TYPES.JSX_TAG_END, value: '>', pos: i });
                return i + 1;
            }

            // Spread: {...props}
            if (char === '{' && code.substring(i, i + 4).match(/^\{\s*\.\.\./)) {
                var spreadEnd = findMatchingBrace(code, i);
                var spreadExpr = code.substring(i + 1, spreadEnd);
                tokens.push({
                    type: TOKEN_TYPES.JSX_SPREAD,
                    value: spreadExpr.replace(/^\s*\.\.\./, '').trim(),
                    pos: i
                });
                i = spreadEnd + 1;
                continue;
            }

            // Attribute: name="value" or name={expr}
            var attrMatch = code.substring(i).match(/^([a-zA-Z][\w-]*)\s*=\s*/);
            if (attrMatch) {
                var attrName = attrMatch[1];
                i += attrMatch[0].length;

                var attrValue;
                var char = code[i];

                // Value is expression: {expr}
                if (char === '{') {
                    var valueEnd = findMatchingBrace(code, i);
                    attrValue = { type: 'expr', value: code.substring(i + 1, valueEnd) };
                    i = valueEnd + 1;
                }
                // Value is string: "value" or 'value'
                else if (char === '"' || char === "'") {
                    var stringEnd = skipString(code, i);
                    attrValue = { type: 'string', value: code.substring(i + 1, stringEnd) };
                    i = stringEnd + 1;
                }
                // Boolean attribute
                else {
                    attrValue = { type: 'boolean', value: 'true' };
                }

                tokens.push({
                    type: TOKEN_TYPES.JSX_ATTR,
                    name: attrName,
                    value: attrValue,
                    pos: i
                });
                continue;
            }

            // Boolean attribute (no value)
            var boolMatch = code.substring(i).match(/^([a-zA-Z][\w-]*)/);
            if (boolMatch) {
                tokens.push({
                    type: TOKEN_TYPES.JSX_ATTR,
                    name: boolMatch[1],
                    value: { type: 'boolean', value: 'true' },
                    pos: i
                });
                i += boolMatch[0].length;
                continue;
            }

            i++;
        }

        return i;
    }

    /**
     * Skip over template literal, including nested ${...} expressions.
     * This is used ONLY for skipping in findMatchingBrace context.
     * Does NOT transform JSX - just finds the end position.
     */
    function skipTemplateLiteral(code, start) {
        var i = start + 1; // Skip opening backtick
        var len = code.length;

        while (i < len) {
            var char = code[i];

            // Escape sequence (including escaped backticks)
            if (char === '\\') {
                i += 2;
                continue;
            }

            // Template literal interpolation ${...}
            // We need to skip the entire interpolation expression
            if (char === '$' && code[i + 1] === '{') {
                // Find matching closing brace for this interpolation
                var braceEnd = findMatchingBrace(code, i + 1);
                i = braceEnd + 1;
                continue;
            }

            // End of template literal
            if (char === '`') {
                return i;
            }

            i++;
        }

        return i;
    }

    /**
     * Find matching closing brace
     */
    function findMatchingBrace(code, start) {
        var depth = 1;
        var i = start + 1;
        var len = code.length;

        while (i < len && depth > 0) {
            var char = code[i];

            // Skip strings and template literals entirely
            if (char === '`') {
                i = skipTemplateLiteral(code, i) + 1;
                continue;
            }
            if (char === '"' || char === "'") {
                i = skipString(code, i) + 1;
                continue;
            }

            // Skip comments
            if (char === '/' && code[i + 1] === '/') {
                // Line comment
                while (i < len && code[i] !== '\n') i++;
                continue;
            }
            if (char === '/' && code[i + 1] === '*') {
                // Block comment
                while (i < len - 1 && !(code[i] === '*' && code[i + 1] === '/')) i++;
                i += 2;
                continue;
            }

            if (char === '{') depth++;
            if (char === '}') depth--;
            i++;
        }

        return i - 1;
    }

    /**
     * Skip over string literal (single or double quotes). Backticks are
     * handled by skipTemplateLiteral to preserve ${...} depth handling.
     */
    function skipString(code, start) {
        var quote = code[start];
        if (quote === '`') return skipTemplateLiteral(code, start);

        var i = start + 1;
        var len = code.length;

        while (i < len) {
            var char = code[i];

            // Escape sequence
            if (char === '\\') {
                i += 2;
                continue;
            }

            // End of string
            if (char === quote) {
                return i;
            }

            i++;
        }

        return i;
    }

    /**
     * Check if position is inside a string
     * CRITICAL: Must handle template literal interpolations ${...}
     * Code inside ${} is NOT considered "in string" for JSX detection
     */
    /**
     * Check if position is inside a string
     * CRITICAL: Must handle template literal interpolations ${...}
     * Code inside ${} is NOT considered "in string" for JSX detection
     * CRITICAL FIX: Must skip comments!
     */
    function inString(code, pos) {
        var inStr = false;
        var quote = null;
        var inInterpolation = 0; // Track ${} nesting depth

        for (var i = 0; i < pos; i++) {
            var char = code[i];

            // If we are NOT in a string, check for comments first to skip them 
            if (!inStr) {
                // Single-line comment //
                if (char === '/' && code[i + 1] === '/') {
                    i += 2;
                    while (i < pos && code[i] !== '\n') {
                        i++;
                    }
                    if (i >= pos) return false; // Reached pos inside comment
                    continue; // Continue loop after newline
                }

                // Multi-line comment /* ... */
                if (char === '/' && code[i + 1] === '*') {
                    i += 2;
                    while (i < pos && !(code[i] === '*' && code[i + 1] === '/')) {
                        i++;
                    }
                    if (i >= pos) return false; // Reached pos inside comment
                    i++; // Skip / of */
                    continue;
                }
            }

            // Start of string
            if (!inStr && (char === '"' || char === "'" || char === '`')) {
                inStr = true;
                quote = char;
                continue;
            }

            // If we're in a string
            if (inStr) {
                // Escape sequence - skip next character
                if (char === '\\') {
                    i++; // Skip the escaped character
                    continue;
                }

                // Template literal interpolation start
                if (quote === '`' && char === '$' && code[i + 1] === '{') {
                    inInterpolation++;
                    i++; // Skip the {
                    continue;
                }

                // Closing brace in template literal
                if (quote === '`' && inInterpolation > 0 && char === '{') {
                    inInterpolation++;
                    continue;
                }

                if (quote === '`' && inInterpolation > 0 && char === '}') {
                    inInterpolation--;
                    continue;
                }

                // End of string (but NOT if we're inside an interpolation)
                if (char === quote && inInterpolation === 0) {
                    inStr = false;
                    quote = null;
                }
            }
        }

        // We're "in string" only if we're in a string AND not in an interpolation
        return inStr && inInterpolation === 0;
    }

    /**
     * Transform JSX to JavaScript (recursive version)
     */
    /**
     * Transform JSX to JavaScript (Debug Version)
     */
    function transformJSX(code) {
        // Wrapper to catch errors at the top level
        try {
            return transformJSXInternal(code);
        } catch (e) {
            console.error("🔥 JSX Transform Error:", e.message);
            console.error("Context:", e.context);
            throw e;
        }
    }

    function transformJSXInternal(code) {
        var output = '';
        var i = 0;
        var len = code.length;
        var line = 1;

        while (i < len) {
            var char = code[i];

            if (char === '\n') line++;

            // Skip strings
            // 1. Strings (single/double quotes) - Copy as is
            if (char === '"' || char === "'") {
                var stringEnd = skipString(code, i);
                output += code.substring(i, stringEnd + 1);

                // Update line count for newlines in string
                var strContent = code.substring(i, stringEnd + 1);
                var newlines = (strContent.match(/\n/g) || []).length;
                line += newlines;

                i = stringEnd + 1;
                continue;
            }

            // 2. Template Literals (backticks)
            try {
                if (char === '`') {
                    // ... (Logic for template literals - simplified for now, assuming the previous fix was correct logic-wise but maybe implemented inside the loop directly)
                    // Actually, let's just use the logic we saw in the previous view_file, but add line counting

                    output += '`'; // Opening backtick
                    i++;

                    while (i < len) {
                        var tChar = code[i];
                        if (tChar === '\n') line++;

                        // End of template literal
                        if (tChar === '`') {
                            output += '`'; // Closing backtick
                            i++;
                            break;
                        }

                        // Escape sequence
                        if (tChar === '\\') {
                            output += tChar;
                            if (i + 1 < len) {
                                output += code[i + 1];
                                i += 2;
                            } else {
                                i++;
                            }
                            continue;
                        }

                        // Interpolation: ${...}
                        if (tChar === '$' && i + 1 < len && code[i + 1] === '{') {
                            // Find the matching closing brace
                            var exprEnd = findMatchingBrace(code, i + 1);

                            // Extract interpolation
                            var exprContent = code.substring(i + 2, exprEnd);

                            // RECURSIVE TRANSFORM
                            var transformedExpr = transformJSXInternal(exprContent);

                            output += '${' + transformedExpr + '}';

                            // Update line count for the skipped content
                            var skippedContent = code.substring(i, exprEnd + 1);
                            var skippedNewlines = (skippedContent.match(/\n/g) || []).length;
                            line += skippedNewlines;

                            i = exprEnd + 1;
                            continue;
                        }

                        output += tChar;
                        i++;
                    }
                    continue;
                }
            } catch (err) {
                // Add context to error
                err.context = "Error inside template literal at line " + line + "\nCode around: " + code.substring(Math.max(0, i - 50), Math.min(len, i + 50));
                throw err;
            }

            // Skip comments
            if (char === '/' && code[i + 1] === '/') {
                var lineEnd = i;
                while (lineEnd < len && code[lineEnd] !== '\n') lineEnd++;
                output += code.substring(i, lineEnd);
                i = lineEnd;
                continue;
            }
            if (char === '/' && code[i + 1] === '*') {
                var commentEnd = i + 2;
                while (commentEnd < len - 1 && !(code[commentEnd] === '*' && code[commentEnd + 1] === '/')) {
                    if (code[commentEnd] === '\n') line++;
                    commentEnd++;
                }
                output += code.substring(i, commentEnd + 2);
                i = commentEnd + 2;
                continue;
            }

            // Check for JSX
            if (char === '<' && !inString(code, i)) {
                var peek = code[i + 1];
                var isJSX = false;

                if (peek === '>') isJSX = true;
                else if (peek === '/' && /[a-zA-Z>]/.test(code[i + 2])) isJSX = true;
                else if (/[a-zA-Z]/.test(peek)) isJSX = true;

                if (isJSX) {
                    try {
                        console.log("🛠️ Found potential JSX at line " + line + ": " + code.substring(i, Math.min(i + 20, len)) + "...");
                        var jsxResult = parseAndTransformJSX(code, i);
                        output += jsxResult.code;

                        // Update line count for transformed JSX
                        // This is tricky because parseAndTransformJSX consumes code but doesn't return line count
                        // We need to estimate or just count newlines in the skipped original code
                        var originalJSX = code.substring(i, jsxResult.nextIndex);
                        var jsxNewlines = (originalJSX.match(/\n/g) || []).length;
                        line += jsxNewlines;

                        i = jsxResult.nextIndex;
                        continue;
                    } catch (err) {
                        err.context = "Error transforming JSX at line " + line + "\nCode around: " + code.substring(Math.max(0, i - 100), Math.min(len, i + 100));
                        throw err;
                    }
                }
            }

            output += char;
            i++;
        }

        return output;
    }

    /**
     * Parse and transform a single JSX element
     */
    function parseAndTransformJSX(code, start) {
        var i = start;
        var len = code.length;

        // Fragment: <>
        if (code[i] === '<' && code[i + 1] === '>') {
            var fragmentResult = parseJSXFragment(code, i);
            return {
                code: generateCode(fragmentResult.node),
                nextIndex: fragmentResult.nextIndex
            };
        }

        // Closing tag (shouldn't happen at top level, but handle it)
        if (code[i] === '<' && code[i + 1] === '/') {
            return { code: '', nextIndex: i };
        }

        // Opening tag: <TagName
        var openMatch = code.substring(i).match(/^<([a-zA-Z][\w.-]*)/);
        if (!openMatch) {
            return { code: '', nextIndex: i + 1 };
        }

        var tagName = openMatch[1];
        i += openMatch[0].length;

        var node = {
            type: 'JSXElement',
            tagName: tagName,
            attributes: [],
            children: [],
            isFragment: false
        };

        // Parse attributes
        while (i < len) {
            // Skip whitespace
            while (i < len && /\s/.test(code[i])) i++;

            var char = code[i];

            // Self-closing: />
            if (char === '/' && code[i + 1] === '>') {
                return {
                    code: generateCode(node),
                    nextIndex: i + 2
                };
            }

            // Tag end: >
            if (char === '>') {
                i++;
                break;
            }

            // Spread: {...props}
            if (char === '{' && code.substring(i, i + 4).match(/^\{\s*\.\.\./)) {
                var spreadEnd = findMatchingBrace(code, i);
                var spreadExpr = code.substring(i + 1, spreadEnd).replace(/^\s*\.\.\./, '').trim();
                // Recursively transform JSX in spread expression
                try {
                    spreadExpr = transformJSX(spreadExpr);
                } catch (_) { /* keep raw spread */ }
                node.attributes.push({
                    type: 'spread',
                    value: spreadExpr
                });
                i = spreadEnd + 1;
                continue;
            }

            // Attribute
            var attrMatch = code.substring(i).match(/^([a-zA-Z][\w-]*)\s*=\s*/);
            if (attrMatch) {
                var attrName = attrMatch[1];
                i += attrMatch[0].length;

                var attrValue;

                // Expression: {expr}
                if (code[i] === '{') {
                    var valueEnd = findMatchingBrace(code, i);
                    var expr = code.substring(i + 1, valueEnd);

                    // Try to transform JSX only when needed; if the expression
                    // is plain JS (e.g. template literals that contain "{/*" as
                    // text), fallback to the raw expression to avoid breaking
                    // the surrounding code.
                    try {
                        expr = transformJSX(expr);
                    } catch (_) { /* keep raw expr */ }

                    attrValue = { type: 'expr', value: expr };
                    i = valueEnd + 1;
                }
                // String: "value" or 'value'
                else if (code[i] === '"' || code[i] === "'") {
                    var stringEnd = skipString(code, i);
                    attrValue = { type: 'string', value: code.substring(i + 1, stringEnd) };
                    i = stringEnd + 1;
                }
                // Boolean
                else {
                    attrValue = { type: 'boolean', value: 'true' };
                }

                node.attributes.push({
                    name: attrName,
                    value: attrValue
                });
                continue;
            }

            // Boolean attribute
            var boolMatch = code.substring(i).match(/^([a-zA-Z][\w-]*)/);
            if (boolMatch) {
                node.attributes.push({
                    name: boolMatch[1],
                    value: { type: 'boolean', value: 'true' }
                });
                i += boolMatch[0].length;
                continue;
            }

            i++;
        }

        // Parse children
        while (i < len) {
            // Skip whitespace between tags
            var wsStart = i;
            while (i < len && /\s/.test(code[i])) i++;
            var ws = code.substring(wsStart, i);

            var char = code[i];

            // Closing tag
            var closeMatch = code.substring(i).match(/^<\/([a-zA-Z][\w.-]*)\s*>/);
            if (closeMatch && closeMatch[1] === tagName) {
                return {
                    code: generateCode(node),
                    nextIndex: i + closeMatch[0].length
                };
            }

            // JSX expression: {expr}
            if (char === '{') {
                var exprEnd = findMatchingBrace(code, i);
                var expr = code.substring(i + 1, exprEnd);

                // Check if comment
                if (startsWithES5(expr.trim(), '/*')) {
                    // Skip comment
                } else {
                    // Recursively transform JSX in expression
                    expr = transformJSX(expr);
                    node.children.push({ type: 'expression', value: expr });
                }
                i = exprEnd + 1;
                continue;
            }

            // Nested JSX
            if (char === '<') {
                var jsxResult = parseAndTransformJSX(code, i);
                if (jsxResult.code) {
                    node.children.push({ type: 'expression', value: jsxResult.code });
                }
                i = jsxResult.nextIndex;
                continue;
            }

            // Text content
            var textStart = i;
            while (i < len && code[i] !== '<' && code[i] !== '{') {
                i++;
            }
            if (i > textStart) {
                var text = code.substring(textStart, i);
                if (text.trim()) {
                    node.children.push({ type: 'text', value: text });
                }
                continue;
            }

            // Safety: prevent infinite loop
            if (i === textStart && i === wsStart) {
                i++;
            }
        }

        return {
            code: generateCode(node),
            nextIndex: i
        };
    }

    /**
     * Parse JSX fragment <>...</>
     */
    function parseJSXFragment(code, start) {
        var node = {
            type: 'JSXElement',
            tagName: '',
            attributes: [],
            children: [],
            isFragment: true
        };

        var i = start + 2; // Skip <>
        var len = code.length;

        while (i < len) {
            // Check for closing: </>
            if (code.substring(i, i + 3) === '</>') {
                return { node: node, nextIndex: i + 3 };
            }

            // JSX expression
            if (code[i] === '{') {
                var exprEnd = findMatchingBrace(code, i);
                var expr = code.substring(i + 1, exprEnd);
                if (!startsWithES5(expr.trim(), '/*')) {
                    expr = transformJSX(expr);
                    node.children.push({ type: 'expression', value: expr });
                }
                i = exprEnd + 1;
                continue;
            }

            // Nested JSX
            if (code[i] === '<') {
                var jsxResult = parseAndTransformJSX(code, i);
                if (jsxResult.code) {
                    node.children.push({ type: 'expression', value: jsxResult.code });
                }
                i = jsxResult.nextIndex;
                continue;
            }

            // Text
            var textStart = i;
            while (i < len && code[i] !== '<' && code[i] !== '{') {
                i++;
            }
            if (i > textStart) {
                var text = code.substring(textStart, i);
                if (text.trim()) {
                    node.children.push({ type: 'text', value: text });
                }
            }
        }

        return { node: node, nextIndex: i };
    }

    // SVG tag names that include uppercase letters but should still be treated as
    // native DOM elements rather than components.
    var svgCamelCaseTags = {
        animateMotion: true,
        animateTransform: true,
        clipPath: true,
        feBlend: true,
        feColorMatrix: true,
        feComponentTransfer: true,
        feComposite: true,
        feConvolveMatrix: true,
        feDiffuseLighting: true,
        feDisplacementMap: true,
        feDistantLight: true,
        feDropShadow: true,
        feFlood: true,
        feFuncA: true,
        feFuncB: true,
        feFuncG: true,
        feFuncR: true,
        feGaussianBlur: true,
        feImage: true,
        feMerge: true,
        feMergeNode: true,
        feMorphology: true,
        feOffset: true,
        fePointLight: true,
        feSpecularLighting: true,
        feSpotLight: true,
        feTile: true,
        feTurbulence: true,
        foreignObject: true,
        linearGradient: true,
        radialGradient: true,
        textPath: true
    };

    /**
     * Generate JavaScript code from JSX AST
     */
    function generateCode(node) {
        if (node.type === 'text') {
            return JSON.stringify(node.value);
        }

        if (node.type === 'expression') {
            return '(' + node.value + ')';
        }

        if (node.type !== 'JSXElement') {
            return '';
        }

        // Fragment: React.createElement(React.Fragment, null, ...children)
        if (node.isFragment) {
            var fragmentChildren = node.children.map(generateCode).join(', ');
            return 'Mishkah.React.createElement(Mishkah.React.Fragment, null, ' + fragmentChildren + ')';
        }

        // Component or element
        var tagName = node.tagName;
        // Treat namespaced tags and components that start with uppercase as components.
        // Allow camelCase components (e.g., "myComponent") while preserving known
        // camelCased SVG element names as DOM tags to avoid ReferenceErrors.
        var hasUppercase = /[A-Z]/.test(tagName);
        var isSVGDomTag = svgCamelCaseTags[tagName];
        var isComponent = tagName.indexOf('.') !== -1 || /^[A-Z]/.test(tagName) || (hasUppercase && !isSVGDomTag && /[a-z]/.test(tagName[0]));
        var tag = isComponent ? tagName : JSON.stringify(tagName);

        // Props
        var propsCode;
        var hasSpread = false;
        var regularProps = [];

        // Separate spread props from regular props
        node.attributes.forEach(function (attr) {
            if (attr.type === 'spread') {
                hasSpread = true;
            } else {
                var propCode = JSON.stringify(attr.name) + ': ';
                if (attr.value.type === 'expr') {
                    propCode += '(' + attr.value.value + ')';
                } else if (attr.value.type === 'string') {
                    propCode += JSON.stringify(attr.value.value);
                } else {
                    propCode += attr.value.value;
                }
                regularProps.push(propCode);
            }
        });

        // Generate props code
        if (hasSpread) {
            // Use Object.assign when spread is present
            var assignArgs = [];
            var currentObj = [];

            node.attributes.forEach(function (attr) {
                if (attr.type === 'spread') {
                    // Push current object if any
                    if (currentObj.length > 0) {
                        assignArgs.push('{' + currentObj.join(', ') + '}');
                        currentObj = [];
                    }
                    // Add spread expression
                    assignArgs.push('(' + attr.value + ')');
                } else {
                    // Add to current object
                    var propCode = JSON.stringify(attr.name) + ': ';
                    if (attr.value.type === 'expr') {
                        propCode += '(' + attr.value.value + ')';
                    } else if (attr.value.type === 'string') {
                        propCode += JSON.stringify(attr.value.value);
                    } else {
                        propCode += attr.value.value;
                    }
                    currentObj.push(propCode);
                }
            });

            // Push final object if any
            if (currentObj.length > 0) {
                assignArgs.push('{' + currentObj.join(', ') + '}');
            }

            if (assignArgs.length === 0) {
                propsCode = 'null';
            } else {
                propsCode = 'Object.assign({}, ' + assignArgs.join(', ') + ')';
            }
        } else {
            // No spread, simple object literal
            if (regularProps.length === 0) {
                propsCode = 'null';
            } else {
                propsCode = '{' + regularProps.join(', ') + '}';
            }
        }

        // Children
        var children = node.children.map(generateCode).join(', ');

        return 'Mishkah.React.createElement(' + tag + ', ' + propsCode + (children ? ', ' + children : '') + ')';
    }

    // ===================================================================
    // Script Processor
    // ===================================================================

    /**
     * Process all <script type="text/jsx"> tags
     */
    function processJSXScripts() {
        var scripts = document.querySelectorAll('script[type="text/jsx"]');

        scripts.forEach(function (script) {
            var jsxCode = script.textContent || script.innerText;

            try {
                // Transform JSX to JS
                var jsCode = transformJSX(jsxCode);

                // DEBUG: Log generated code
                console.log('=== Generated JavaScript ===');
                console.log(jsCode);
                console.log('============================');

                // Execute transformed code
                var scriptEl = document.createElement('script');
                scriptEl.textContent = jsCode;
                document.body.appendChild(scriptEl);
            } catch (error) {
                console.error('JSX Parse Error:', error);
                console.error('Original JSX:', jsxCode);
                console.error('Generated JS:', jsCode);
            }
        });
    }

    // ===================================================================
    // Fragment Support
    // ===================================================================

    if (!React.Fragment) {
        React.Fragment = function Fragment(props) {
            return props.children || [];
        };
    }

    // ===================================================================
    // Initialize
    // ===================================================================

    // Auto-process JSX scripts when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', processJSXScripts);
    } else {
        processJSXScripts();
    }

    // Expose API
    global.MishkahJSX = {
        transform: transformJSX,
        process: processJSXScripts
    };

})(typeof window !== 'undefined' ? window : this);