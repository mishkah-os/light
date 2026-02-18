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
                en: 'JSON is a lightweight, text-based format derived from JavaScript object syntax. It is the de facto standard for web APIs due to its simplicity, human readability, and native support in browsers. It supports strings, numbers, booleans, arrays, and objects.',
                ar: 'JSON هو تنسيق نصي خفيف مشتق من صياغة كائنات جافاسكريبت. يعتبر المعيار الفعلي لواجهات برمجة التطبيقات (API) لبساطته وسهولة قراءته ودعمه الأصلي في المتصفحات. يدعم السلاسل النصية والأرقام والقيم المنطقية والمصفوفات والكائنات.'
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
                en: 'XML is a markup language designed to store and transport data. It is verbose but highly structured, supporting complex hierarchies, attributes, and namespaces. It is widely used in enterprise systems, SOAP web services, and configuration files.',
                ar: 'XML هي لغة ترميز مصممة لتخزين ونقل البيانات. تتسم بالإطناب لكنها منظمة للغاية، وتدعم الهياكل الهرمية المعقدة والسمات ومساحات الأسماء. تستخدم على نطاق واسع في الأنظمة المؤسسية وخدمات الويب SOAP وملفات التكوين.'
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
                en: 'YAML is a human-friendly data serialization standard often used for configuration files. It uses indentation to denote structure, making it cleaner than JSON or XML. It supports comments and complex data types like references.',
                ar: 'YAML هو معيار لتسلسل البيانات صديق للبشر يستخدم غالباً لملفات التكوين (Configuration). يستخدم المسافات البادئة لتحديد الهيكل، مما يجعله أنظف من JSON أو XML. يدعم التعليقات وأنواع البيانات المعقدة مثل المراجع.'
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
                en: 'CSV is a plain text format used to store tabular data (numbers and text). Each line is a data record, and each record consists of one or more fields separated by commas. It is widely supported by spreadsheet applications like Excel and databases.',
                ar: 'CSV هو تنسيق نصي بسيط يستخدم لتخزين البيانات الجدولية (الأرقام والنصوص). كل سطر هو سجل بيانات، وكل سجل يتكون من حقل واحد أو أكثر مفصولة بفواصل. مدعوم على نطاق واسع من قبل تطبيقات جداول البيانات مثل Excel وقواعد البيانات.'
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
                en: 'TOML aims to be a minimal configuration file format that is easy to read due to obvious semantics. It maps unambiguously to a hash table and is widely adopted in Rust (Cargo) and Python communities.',
                ar: 'يهدف TOML ليكون تنسيق ملف تكوين بسيطاً وسهل القراءة بفضل دلالاته الواضحة. يرتبط بشكل لا لبس فيه بجداول التجزئة (Hash Tables) وتم تبنيه على نطاق واسع في مجتمعات Rust وPython.'
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
                en: 'INI files are simple text files with a basic structure composed of sections, properties, and values. Historically used by Windows, they are easy to parse but lack standardization and support for complex nested data structures.',
                ar: 'ملفات INI هي ملفات نصية بسيطة بهيكل أساسي يتكون من أقسام وخصائص وقيم. استخدمت تاريخياً بواسطة Windows، وهي سهلة التحليل لكنها تفتقر إلى المعايير ودعم هياكل البيانات المتداخلة المعقدة.'
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
                en: 'BSON is a binary-encoded serialization of JSON-like documents. It extends JSON with additional data types like Date and Binary data, and is designed to be efficient for storage and scanning (traversal). It is the primary storage format for MongoDB.',
                ar: 'BSON هو تشفير ثنائي لوثائق تشبه JSON. يوسع JSON بأنواع بيانات إضافية مثل التاريخ والبيانات الثنائية، ومصمم ليكون فعالاً للتخزين والمسح (traversal). هو تنسيق التخزين الأساسي لـ MongoDB.'
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
                en: 'Protocol Buffers are Google\'s language-neutral, platform-neutral, extensible mechanism for serializing structured data. It requires a schema (.proto file) to generate code for serialization, resulting in extremely compact and fast binary messages.',
                ar: 'Protocol Buffers هي آلية Google المحايدة للغة والمنصة والقابلة للتوسع لتسلسل البيانات الهيكلية. تتطلب مخططاً (ملف .proto) لتوليد كود التسلسل، مما ينتج عنه رسائل ثنائية مدمجة وسريعة للغاية.'
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
                en: 'MessagePack is an efficient binary serialization format. It allows you to exchange data among multiple languages like JSON but it is faster and smaller. It does not require a pre-defined schema, making it a drop-in binary replacement for JSON.',
                ar: 'MessagePack هو تنسيق تسلسل ثنائي فعال. يسمح بتبادل البيانات بين لغات متعددة مثل JSON ولكنه أسرع وأصغر حجماً. لا يتطلب مخططاً محدداً مسبقاً، مما يجعله بديلاً ثنائياً مباشراً لـ JSON.'
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
                en: 'Avro is a row-oriented remote procedure call and data serialization framework developed within Apache\'s Hadoop project. It supports schema evolution (changes to data structure over time) and stores the schema along with the data.',
                ar: 'Avro هو إطار عمل لتسلسل البيانات واستدعاء الإجراءات عن بعد، موجه للصفوف، طُور ضمن مشروع Hadoop. يدعم تطور المخطط (Schema Evolution) ويخزن المخطط جنباً إلى جنب مع البيانات.'
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
