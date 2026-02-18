(function (window) {
    var formats = [
        {
            id: 'data-formats',
            title: { en: 'Data Formats', ar: 'تنسيقات البيانات' },
            keywords: ['data', 'format', 'json', 'xml', 'yaml', 'csv'],
            content: {
                en: 'Data formats define how information is structured, stored, and exchanged between systems. Choosing the right format depends on the use case: human readability (JSON, YAML), strict validation (XML), tabular data (CSV), or efficient binary transmission (Protobuf, Avro).',
                ar: 'تحدد تنسيقات البيانات كيفية هيكلة المعلومات وتخزينها وتبادلها بين الأنظمة. اختيار التنسيق المناسب يعتمد على حالة الاستخدام: سهولة القراءة البشرية (JSON, YAML)، التحقق الصارم (XML)، البيانات الجدولية (CSV)، أو النقل الثنائي الفعال (Protobuf, Avro).'
            },
            words: [
                { 'readability': 'readability' },
                { 'efficiency': 'efficiency' }
            ],
            parents_ids: [],
            siblings: [],
            sort: 100
        },
        {
            id: 'json',
            title: { en: 'JSON (JavaScript Object Notation)', ar: 'JSON (تدوين كائنات جافاسكريبت)' },
            keywords: ['json', 'web', 'api', 'rest'],
            content: {
                en: `JSON is a lightweight, text-based format derived from JavaScript object syntax. It is the de facto standard for web APIs due to its simplicity, human readability, and native support in browsers. It supports strings, numbers, booleans, arrays, and objects.

### Example
\`\`\`json
{
  "id": 101,
  "name": "Wiki Data",
  "active": true,
  "tags": ["format", "guide"]
}
\`\`\`

### Pros & Cons
**Advantages:**
- **Native to JS:** Parsed natively in browsers with \`JSON.parse()\`.
- **Readable:** Easy for humans to read and write.
- **Widely Supported:** Standard for REST APIs.

**Disadvantages:**
- **No Comments:** Does not support comments.
- **Verbose:** Syntax (quotes, brackets) adds overhead compared to binary.
`,
                ar: `JSON هو تنسيق نصي خفيف مشتق من صياغة كائنات جافاسكريبت. يعتبر المعيار الفعلي لواجهات برمجة التطبيقات (API) لبساطته وسهولة قراءته ودعمه الأصلي في المتصفحات. يدعم السلاسل النصية والأرقام والقيم المنطقية والمصفوفات والكائنات.

### مثال
\`\`\`json
{
  "id": 101,
  "name": "ويكي بيانات",
  "active": true,
  "tags": ["تنسيق", "دليل"]
}
\`\`\`

### المميزات والعيوب
**المميزات:**
- **أصلي في JS:** يتم تحليله مباشرة في المتصفحات باستخدام \`JSON.parse()\`.
- **سهل القراءة:** سهل للبشر للقراءة والكتابة.
- **مدعوم عالمياً:** المعيار الأساسي لواجهات REST API.

**العيوب:**
- **لا تعليقات:** لا يدعم إضافة التعليقات.
- **الإطناب:** الرموز (علامات التنصيص، الأقواس) تزيد الحجم مقارنة بالتنسيقات الثنائية.
`
            },
            words: [
                { 'API': 'api' },
                { 'Browser': 'browser' }
            ],
            parents_ids: ['data-formats'],
            siblings: [
                { id: 'xml', title: { en: 'XML', ar: 'XML' } },
                { id: 'yaml', title: { en: 'YAML', ar: 'YAML' } }
            ],
            sort: 101
        },
        {
            id: 'xml',
            title: { en: 'XML (eXtensible Markup Language)', ar: 'XML (لغة الترميز القابلة للامتداد)' },
            keywords: ['xml', 'markup', 'schema', 'soap'],
            content: {
                en: `XML is a markup language designed to store and transport data. It is verbose but highly structured, supporting complex hierarchies, attributes, and namespaces. It is widely used in enterprise systems, SOAP web services, and configuration files.

### Example
\`\`\`xml
<article id="101">
  <name>Wiki Data</name>
  <active>true</active>
  <tags>
    <tag>format</tag>
    <tag>guide</tag>
  </tags>
</article>
\`\`\`

### Pros & Cons
**Advantages:**
- **Metadata:** Supports attributes for metadata separate from content.
- **Validation:** Schemas (XSD) allow strict data validation.
- **Standardized:** Reliable for complex enterprise data exchange.

**Disadvantages:**
- **Verbose:** Repetitive tags increase file size heavily.
- **Complex Parsing:** Parsing is slower and more memory-intensive than JSON.
- **Cluttered:** Harder for humans to read quickly due to tag noise.
`,
                ar: `XML هي لغة ترميز مصممة لتخزين ونقل البيانات. تتسم بالإطناب لكنها منظمة للغاية، وتدعم الهياكل الهرمية المعقدة والسمات ومساحات الأسماء. تستخدم على نطاق واسع في الأنظمة المؤسسية وخدمات الويب SOAP وملفات التكوين.

### مثال
\`\`\`xml
<article id="101">
  <name>ويكي بيانات</name>
  <active>true</active>
  <tags>
    <tag>تنسيق</tag>
    <tag>دليل</tag>
  </tags>
</article>
\`\`\`

### المميزات والعيوب
**المميزات:**
- **بيانات وصفية:** يدعم السمات (Attributes) لفصل البيانات الوصفية عن المحتوى.
- **التحقق:** المخططات (XSD) تسمح بتحقق صارم من صحة البيانات.
- **معياري:** موثوق لتبادل البيانات المعقدة في المؤسسات.

**العيوب:**
- **الإطناب:** تكرار الوسوم يزيد حجم الملف بشكل كبير.
- **تعقيد المعالجة:** التحليل أبطأ ويستهلك ذاكرة أكثر من JSON.
- **فوضوي:** أصعب في القراءة السريعة بسبب كثرة الوسوم.
`
            },
            words: [
                { 'Schema': 'schema' },
                { 'Enterprise': 'enterprise' }
            ],
            parents_ids: ['data-formats'],
            siblings: [
                { id: 'json', title: { en: 'JSON', ar: 'JSON' } }
            ],
            sort: 102
        },
        {
            id: 'yaml',
            title: { en: 'YAML (YAML Ain\'t Markup Language)', ar: 'YAML (ليس لغة ترميز)' },
            keywords: ['yaml', 'configuration', 'devops', 'readability'],
            content: {
                en: `YAML is a human-friendly data serialization standard often used for configuration files. It uses indentation to denote structure, making it cleaner than JSON or XML. It supports comments and complex data types like references.

### Example
\`\`\`yaml
id: 101
name: Wiki Data
active: true
tags:
  - format
  - guide
# This is a comment
\`\`\`

### Pros & Cons
**Advantages:**
- **Readable:** Cleanest syntax, very easy for humans to scan.
- **Comments:** Supports comments (essential for config files).
- **Features:** Supports anchors and references to avoid repetition.

**Disadvantages:**
- **Indentation Sensitivity:** Incorrect spacing breaks the file (like Python).
- **Parsing Complexity:** Parser security vulnerabilities are historically common.
- **Ambiguity:** Auto-casting (e.g., "no" becoming boolean false) can cause bugs.
`,
                ar: `YAML هو معيار لتسلسل البيانات صديق للبشر يستخدم غالباً لملفات التكوين (Configuration). يستخدم المسافات البادئة لتحديد الهيكل، مما يجعله أنظف من JSON أو XML. يدعم التعليقات وأنواع البيانات المعقدة مثل المراجع.

### مثال
\`\`\`yaml
id: 101
name: ويكي بيانات
active: true
tags:
  - تنسيق
  - دليل
# هذا تعليق
\`\`\`

### المميزات والعيوب
**المميزات:**
- **سهل القراءة:** أنظف صياغة، سهل جداً للمسح البصري.
- **تعليقات:** يدعم التعليقات (ضروري لملفات الإعدادات).
- **ميزات:** يدعم المراسي (Anchors) والمراجع لتجنب التكرار.

**العيوب:**
- **حساسية المسافات:** المسافات الخاطئة تكسر الملف (مثل Python).
- **تعقيد التحليل:** ثغرات المحللات الأمنية كانت شائعة تاريخياً.
- **الغموض:** التحويل التلقائي للأنواع (مثل اعتبار "no" كـ boolean false) قد يسبب أخطاء.
`
            },
            words: [
                { 'Configuration': 'config' },
                { 'Indentation': 'indentation' }
            ],
            parents_ids: ['data-formats'],
            siblings: [],
            sort: 103
        },
        {
            id: 'csv',
            title: { en: 'CSV (Comma-Separated Values)', ar: 'CSV (القيم المفصولة بفواصل)' },
            keywords: ['csv', 'tabular', 'spreadsheet', 'data analysis'],
            content: {
                en: `CSV is a plain text format used to store tabular data (numbers and text). Each line is a data record, and each record consists of one or more fields separated by commas. It is widely supported by spreadsheet applications like Excel and databases.

### Example
\`\`\`csv
id,name,active,tags
101,Wiki Data,true,"format|guide"
102,User Data,false,"user|auth"
\`\`\`

### Pros & Cons
**Advantages:**
- **Universal:** Opened by Excel, Google Sheets, and almost any data tool.
- **Compact:** Minimal overhead for simple tabular data.
- **Simple:** Very easy to parse and generate programmatically.

**Disadvantages:**
- **Flat Only:** Cannot represent nested objects or trees.
- **No Types:** Everything is a string; numbers/dates require inference.
- **Escaping Hell:** Handling commas or newlines inside values can be tricky.
`,
                ar: `CSV هو تنسيق نصي بسيط يستخدم لتخزين البيانات الجدولية (الأرقام والنصوص). كل سطر هو سجل بيانات، وكل سجل يتكون من حقل واحد أو أكثر مفصولة بفواصل. مدعوم على نطاق واسع من قبل تطبيقات جداول البيانات مثل Excel وقواعد البيانات.

### مثال
\`\`\`csv
id,name,active,tags
101,Wiki Data,true,"format|guide"
102,User Data,false,"user|auth"
\`\`\`

### المميزات والعيوب
**المميزات:**
- **عالمي:** يفتح بواسطة Excel و Google Sheets وتقريباً أي أداة بيانات.
- **مضغوط:** أقل حجم ممكن للبيانات الجدولية.
- **بسيط:** سهل جداً في التحليل والتوليد برمجياً.

**العيوب:**
- **مسطح فقط:** لا يمكنه تمثيل الكائنات المتداخلة أو الأشجار.
- **بلا أنواع:** كل شيء نص؛ الأرقام والتواريخ تحتاج تخمين أو تحويل.
- **مشاكل الهروب:** التعامل مع الفواصل أو الأسطر الجديدة داخل القيم قد يكون معقداً.
`
            },
            words: [
                { 'Tabular': 'tabular' },
                { 'Excel': 'excel' }
            ],
            parents_ids: ['data-formats'],
            siblings: [],
            sort: 104
        },
        {
            id: 'toml',
            title: { en: 'TOML (Tom\'s Obvious, Minimal Language)', ar: 'TOML' },
            keywords: ['toml', 'configuration', 'rust', 'python'],
            content: {
                en: `TOML aims to be a minimal configuration file format that is easy to read due to obvious semantics. It maps unambiguously to a hash table and is widely adopted in Rust (Cargo) and Python communities.

### Example
\`\`\`toml
[article]
id = 101
name = "Wiki Data"
active = true
tags = ["format", "guide"]

[owner]
name = "Admin"
since = 2023-01-01
\`\`\`

### Pros & Cons
**Advantages:**
- **Obvious:** Unambiguous syntax (unlike YAML).
- **Typed:** Strong typing for dates, times, and numbers.
- **Developer Friendly:** Great for configuration with nested sections.

**Disadvantages:**
- **Verbosity:** Can become verbose for deeply nested structures (repeating keys).
- **Less Adoption:** Less common than JSON or YAML outside specific ecosystems (Rust/Python).
`,
                ar: `يهدف TOML ليكون تنسيق ملف تكوين بسيطاً وسهل القراءة بفضل دلالاته الواضحة. يرتبط بشكل لا لبس فيه بجداول التجزئة (Hash Tables) وتم تبنيه على نطاق واسع في مجتمعات Rust وPython.

### مثال
\`\`\`toml
[article]
id = 101
name = "Wiki Data"
active = true
tags = ["format", "guide"]

[owner]
name = "Admin"
since = 2023-01-01
\`\`\`

### المميزات والعيوب
**المميزات:**
- **واضح:** صياغة غير غامضة (على عكس YAML).
- **محدد النوع:** دعم قوي لتواريخ وأرقام محددة.
- **صديق للمطور:** ممتاز لملفات الإعدادات ذات الأقسام المتداخلة.

**العيوب:**
- **التكرار:** قد يصبح مطنباً في الهياكل العميقة (تكرار المفاتيح).
- **انتشار أقل:** أقل شيوعاً من JSON أو YAML خارج بيئات محددة (Rust/Python).
`
            },
            words: [
                { 'Minimal': 'minimal' },
                { 'Config': 'config' }
            ],
            parents_ids: ['data-formats'],
            siblings: [],
            sort: 105
        },
        {
            id: 'ini',
            title: { en: 'INI (Initialization)', ar: 'ملفات INI' },
            keywords: ['ini', 'windows', 'config', 'sections'],
            content: {
                en: `INI files are simple text files with a basic structure composed of sections, properties, and values. Historically used by Windows, they are easy to parse but lack standardization.

### Example
\`\`\`ini
[Article]
id=101
name=Wiki Data
active=true

[Tags]
tag1=format
tag2=guide
\`\`\`

### Pros & Cons
**Advantages:**
- **Simplest:** The easiest format to read/write for flat configurations.
- **Legacy Support:** Supported by almost every OS standard library.

**Disadvantages:**
- **No Standard:** Different parsers handle whitespace/comments differently.
- **Structure Limit:** Only supports two levels (Section -> Key). No arrays or nested objects.
- **Types:** Everything is a string.
`,
                ar: `ملفات INI هي ملفات نصية بسيطة بهيكل أساسي يتكون من أقسام وخصائص وقيم. استخدمت تاريخياً بواسطة Windows، وهي سهلة التحليل لكنها تفتقر إلى المعايير.

### مثال
\`\`\`ini
[Article]
id=101
name=Wiki Data
active=true

[Tags]
tag1=format
tag2=guide
\`\`\`

### المميزات والعيوب
**المميزات:**
- **الأبسط:** أسهل تنسيق للقراءة/الكتابة للإعدادات المسطحة.
- **دعم قديم:** مدعومة في المكتبات القياسية لكل أنظمة التشغيل تقريباً.

**العيوب:**
- **لا معيار:** تختلف المحللات في التعامل مع المسافات والتعليقات.
- **محدودية الهيكل:** يدعم مستويين فقط (قسم -> مفتاح). لا مصفوفات أو كائنات متداخلة.
- **الأنواع:** كل شيء يُعامل كنص.
`
            },
            words: [
                { 'Windows': 'windows' },
                { 'Simple': 'simple' }
            ],
            parents_ids: ['data-formats'],
            siblings: [],
            sort: 106
        },
        {
            id: 'bson',
            title: { en: 'BSON (Binary JSON)', ar: 'BSON' },
            keywords: ['bson', 'mongodb', 'binary', 'efficiency'],
            content: {
                en: `BSON is a binary-encoded serialization of JSON-like documents. It extends JSON with additional data types like Date and Binary data, and is designed to be efficient for storage and scanning.

### Example (Conceptual Representation)
\`\`\`
\\x16\\x00\\x00\\x00           // Total size
\\x02                     // Type String
name\\x00                 // Field name
\\x0A\\x00\\x00\\x00Wiki Data\\x00 // Value
\\x00                     // End of object
\`\`\`

### Pros & Cons
**Advantages:**
- **Traversable:** Designed to be scanned easily (length-prefixed fields).
- **Rich Types:** Supports Date, Binary, ObjectId directly.
- **MongoDB Native:** Optimized for document database storage.

**Disadvantages:**
- **Size:** Often larger than JSON due to length prefixes and overhead.
- **Not Readable:** Requires tools to view/edit (it's binary).
- **Niche:** Mostly used only within MongoDB ecosystem.
`,
                ar: `BSON هو تشفير ثنائي لوثائق تشبه JSON. يوسع JSON بأنواع بيانات إضافية مثل التاريخ والبيانات الثنائية، ومصمم ليكون فعالاً للتخزين والمسح.

### مثال (تمثيل مفاهيمي)
\`\`\`
\\x16\\x00\\x00\\x00           // الحجم الكلي
\\x02                     // نوع نص
name\\x00                 // اسم الحقل
\\x0A\\x00\\x00\\x00Wiki Data\\x00 // القيمة
\\x00                     // نهاية الكائن
\`\`\`

### المميزات والعيوب
**المميزات:**
- **قابل للمسح:** مصمم ليسهل القفز داخل الملف (حقول مسبوقة بالطول).
- **أنواع غنية:** يدعم التاريخ، البيانات الثنائية، و ObjectId مباشرة.
- **أصلي لـ MongoDB:** محسن لتخزين قواعد بيانات الوثائق.

**العيوب:**
- **الحجم:** غالباً أكبر من JSON بسبب بادئات الطول والإطناب.
- **غير مقروء:** يتطلب أدوات للعرض/التعديل (ثنائي).
- **محدود:** يستخدم غالباً فقط ضمن بيئة MongoDB.
`
            },
            words: [
                { 'Binary': 'binary' },
                { 'MongoDB': 'mongodb' }
            ],
            parents_ids: ['data-formats'],
            siblings: [
                { id: 'json', title: { en: 'JSON', ar: 'JSON' } }
            ],
            sort: 107
        },
        {
            id: 'protobuf',
            title: { en: 'Protocol Buffers (Protobuf)', ar: 'Protobuf (بروتوكول بافرز)' },
            keywords: ['protobuf', 'google', 'rpc', 'binary'],
            content: {
                en: `Protocol Buffers are Google's mechanism for serializing structured data. It requires a schema (.proto file) to generate code, resulting in extremely compact and fast binary messages.

### Example (.proto schema)
\`\`\`protobuf
message Article {
  required int32 id = 1;
  required string name = 2;
  optional bool active = 3;
}
\`\`\`

### Pros & Cons
**Advantages:**
- **Size & Speed:** Extremely small and fast to parse (binary).
- **Schema Evolution:** Backward/Forward compatibility built-in.
- **Typed:** Strongly typed contract between services (gRPC).

**Disadvantages:**
- **Schema Required:** Cannot decode data without the .proto file.
- **Not Human Readable:** It's a binary stream.
- **Tooling:** Requires valid compilation step to generate code.
`,
                ar: `Protocol Buffers هي آلية Google لتسلسل البيانات الهيكلية. تتطلب مخططاً (ملف .proto) لتوليد كود، مما ينتج عنه رسائل ثنائية مدمجة وسريعة للغاية.

### مثال (مخطط .proto)
\`\`\`protobuf
message Article {
  required int32 id = 1;
  required string name = 2;
  optional bool active = 3;
}
\`\`\`

### المميزات والعيوب
**المميزات:**
- **الحجم والسرعة:** صغير جداً وسريع التحليل (ثنائي).
- **تطور المخطط:** توافق أمامي/خلفي مدمج.
- **محدد النوع:** عقد قوي الأنواع بين الخدمات (gRPC).

**العيوب:**
- **يتطلب مخطط:** لا يمكن فك تشفير البيانات بدون ملف .proto.
- **غير مقروء للبشر:** هو تيار ثنائي.
- **الأدوات:** يتطلب خطوة ترجمة لتوليد الكود.
`
            },
            words: [
                { 'Schema': 'schema' },
                { 'Compact': 'compact' }
            ],
            parents_ids: ['data-formats'],
            siblings: [
                { id: 'avro', title: { en: 'Avro', ar: 'Avro' } }
            ],
            sort: 108
        },
        {
            id: 'msgpack',
            title: { en: 'MessagePack', ar: 'MessagePack' },
            keywords: ['msgpack', 'binary', 'compact', 'json replacement'],
            content: {
                en: `MessagePack is an efficient binary serialization format. It allows you to exchange data among multiple languages like JSON but it is faster and smaller. It does not require a pre-defined schema.

### Example (Conceptual)
JSON: \`{"compact": true}\`
MsgPack: \`81 A7 63 6F 6D 70 61 63 74 C3\` (10 bytes vs 18 bytes)

### Pros & Cons
**Advantages:**
- **Compact:** Significantly smaller than JSON for most data.
- **Schema-less:** Drop-in replacement for JSON (no .proto file needed).
- **Fast:** Very fast serialization/deserialization.

**Disadvantages:**
- **Binary:** Not human readable/editable without tools.
- **Debugging:** Harder to debug network traffic than text formats.
`,
                ar: `MessagePack هو تنسيق تسلسل ثنائي فعال. يسمح بتبادل البيانات بين لغات متعددة مثل JSON ولكنه أسرع وأصغر حجماً. لا يتطلب مخططاً محدداً مسبقاً.

### مثال (مفاهيمي)
JSON: \`{"compact": true}\`
MsgPack: \`81 A7 63 6F 6D 70 61 63 74 C3\` (10 بايت مقابل 18 بايت)

### المميزات والعيوب
**المميزات:**
- **مضغوط:** أصغر بكثير من JSON لمعظم البيانات.
- **بلا مخطط:** بديل مباشر لـ JSON (لا يحتاج ملف .proto).
- **سريع:** تسلسل وإلغاء تسلسل سريع جداً.

**العيوب:**
- **ثنائي:** غير مقروء/قابل للتعديل بدون أدوات.
- **التنقيح:** أصعب في فحص حركة الشبكة مقارنة بالتنسيقات النصية.
`
            },
            words: [
                { 'Drop-in': 'drop-in' },
                { 'Fast': 'fast' }
            ],
            parents_ids: ['data-formats'],
            siblings: [],
            sort: 109
        },
        {
            id: 'avro',
            title: { en: 'Apache Avro', ar: 'Apache Avro' },
            keywords: ['avro', 'hadoop', 'big data', 'schema evolution'],
            content: {
                en: `Avro is a row-oriented remote procedure call and data serialization framework. It supports schema evolution and stores the schema along with the data (in container files), making it self-describing.

### Example (Schema)
\`\`\`json
{
  "type": "record",
  "name": "User",
  "fields": [
    {"name": "name", "type": "string"},
    {"name": "age", "type": "int"}
  ]
}
\`\`\`

### Pros & Cons
**Advantages:**
- **Schema Evolution:** Best in class for handling changing data structures over time.
- **Self-describing:** Container files include the schema, so data is always readable.
- **Big Data:** Standard for Hadoop/Spark ecosystems.

**Disadvantages:**
- **Complexity:** Overkill for simple applications.
- **Tooling:** Less generic tooling support compared to CSV/JSON.
`,
                ar: `Avro هو إطار عمل لتسلسل البيانات موجه للصفوف. يدعم تطور المخطط ويخزن المخطط جنباً إلى جنب مع البيانات (في ملفات الحاوية)، مما يجعله ذاتي الوصف.

### مثال (مخطط)
\`\`\`json
{
  "type": "record",
  "name": "User",
  "fields": [
    {"name": "name", "type": "string"},
    {"name": "age", "type": "int"}
  ]
}
\`\`\`

### المميزات والعيوب
**المميزات:**
- **تطور المخطط:** الأفضل في التعامل مع تغيير هياكل البيانات مع مرور الوقت.
- **ذاتي الوصف:** الملفات تتضمن المخطط، لذا البيانات دائماً قابلة للقراءة.
- **البيانات الضخمة:** المعيار لأنظمة Hadoop/Spark.

**العيوب:**
- **التعقيد:** مبالغ فيه للتطبيقات البسيطة.
- **الأدوات:** دعم أدوات عامة أقل مقارنة بـ CSV/JSON.
`
            },
            words: [
                { 'Big Data': 'big-data' },
                { 'Schema Evolution': 'schema-evolution' }
            ],
            parents_ids: ['data-formats'],
            siblings: [],
            sort: 110
        }
    ];

    if (window.codewikidb) {
        window.codewikidb = window.codewikidb.concat(formats);
    } else {
        window.codewikidb = formats;
    }

})(window);
