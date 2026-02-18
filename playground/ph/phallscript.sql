
create or alter view  ph_invoice_header
as
select m.ID_N as ID, m.invoice_nmbr as invoice_number,m.invoice_date ,m.invoice_type as document_id, m.store_code as store_id ,m.acc_code as account_id ,p.Project_name ,p.ID  as Project_id 
, m.invoice_date as begin_date , m.handling_cost,m.trans_cost,m.other_cost,m.t_val as total_items_value


from
    Maspharon2017.dbo. invoice_mstr m
    left outer join PM_Projects p on p.ID collate Arabic_CI_AS = m.Project_name
    
    
    create or alter view  ph_invoice_details
as
select d.ID_N as ID ,d.sr as serial ,d.price ,d.dis as discount,d.cos_price  as cost_price,d.stkx as stock, d.ID_M as invoice_id ,d.begin_date , p.file_link + p.Knum as item_id from 
 Maspharon2017.dbo. invoice_dtl d  join  Maspharon2017.dbo. products p  on  p.barcode2= d.item_id
 
 
 create or alter view ph_items


as

select p.file_link + p.Knum
 as ID ,Max(c.type_name)  as category_name,max(p.Product_name_ar) as Product_name ,p.file_link as category_id ,max(p.cost_price ) as cost_price,p.Knum as item_key ,Max(p.Begin_Date) as begin_date from  Maspharon2017.dbo. products p join Maspharon2017.dbo.pro_categ_dtl c on c.type_code = substring(p.file_link,3,2)
 
 group by p.Knum ,p.file_link
 
 create or alter view ph_accounts

as


select  Ac.code as ID ,ct.type_name as account_type ,cv.cust_importance as  importance,Ac.Acc_name as account_name  ,st.sales_man_name,cv.create_date as Begin_Date  

from  Maspharon2017.dbo. Acc_code Ac 
join  Maspharon2017.dbo.acc_type ct on ct.type_code = Ac.Acc_type

left outer join  Maspharon2017.dbo.customers_vendors_data cv on cv.ID_N = AC.ID_prof
left outer join  Maspharon2017.dbo.sales_man_tbl st on st.sales_man_code = cv.sales_man_code

create or alter view ph_documents
as
select d.ID_N as ID,  d.type_name as document_name ,d.type_code as document_code ,d.stat  from   MasPharon2017.dbo. document d


create or alter view ph_stores
as

select  s.ID_N as ID,s.type_name as store_name,s.type_code as store_code   from  MasPharon2017.dbo.stors s


create or alter  ph_fin

as

select fd.ID_N as ID ,d.document_name,fd.invoice_nmbr,fd.invoice_date ,fd.acc_code as account_id ,a.account_name ,fd.monye as transaction_value ,fd.nots as notes,fd.invoice_date as begin_Date  ,d.stat,fd.invoice_type as document_id
from Maspharon2017.dbo. fin_dtl fd
join ph_documents d on fd.invoice_type = d.ID
join ph_accounts a on a.ID = fd.acc_code


create view ph_invoice_all
as

SELECT
    -- Fact (الحركة)
    pid.ID                         AS invoice_dtl_id,
    pid.begin_date                 AS dtl_begin_date,
    pid.serial,
    pid.item_id,
    pid.stock                      AS qty,
    pid.price,
    pid.discount,
    pid.cost_price                 AS line_cost_price,
    pid.invoice_id,

    -- Header
    pih.ID                         AS invoice_hdr_id,
    pih.invoice_number,
    pih.invoice_date,
    pih.document_id,
    pih.store_id,
    pih.account_id,
    pih.Project_name,
    pih.Project_id,
    pih.begin_date                 AS hdr_begin_date,
    pih.handling_cost,
    pih.trans_cost,
    pih.other_cost,
    pih.total_items_value,

    -- Store
    ps.store_name,
    ps.store_code,

    -- Document
    pd.document_name,
    pd.document_code,
    pd.stat                        AS document_stat,

    -- Account
    pa.account_type,
    pa.importance                  AS account_importance,
    pa.account_name,
    pa.sales_man_name,
    pa.Begin_Date                  AS account_begin_date,

    -- Item
    pi.category_name,
    pi.Product_name,
    pi.category_id,
    pi.cost_price                  AS item_cost_price,
    pi.item_key,
    pi.begin_date                  AS item_begin_date

FROM ph_invoice_details pid
JOIN ph_invoice_header  pih ON pih.ID = pid.invoice_id
LEFT JOIN ph_stores     ps  ON ps.ID  = pih.store_id
LEFT JOIN ph_documents  pd  ON pd.ID  = pih.document_id
LEFT JOIN ph_accounts   pa  ON pa.ID  = pih.account_id
LEFT JOIN ph_items      pi  ON pi.ID  = pid.item_id;


CREATE  or alter PROCEDURE dbo.ph_invoice_genrate_wh_data
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @StartDate DATE = '20170101';
    DECLARE @EndDate   DATE = '20330101';

    IF NOT EXISTS (SELECT 1 FROM sys.partition_functions WHERE name = 'pf_ph_invoice_date')
    BEGIN
        DECLARE @sql NVARCHAR(MAX) = N'CREATE PARTITION FUNCTION pf_ph_invoice_date (DATETIME) AS RANGE RIGHT FOR VALUES (';
        DECLARE @d DATE = DATEADD(MONTH, 1, @StartDate);

        WHILE @d <= @EndDate
        BEGIN
            SET @sql += N'''' + CONVERT(NVARCHAR(10), @d, 120) + N''',';
            SET @d = DATEADD(MONTH, 1, @d);
        END

        SET @sql = LEFT(@sql, LEN(@sql) - 1) + N');';
        EXEC sp_executesql @sql;
    END

    IF NOT EXISTS (SELECT 1 FROM sys.partition_schemes WHERE name = 'ps_ph_invoice_date')
        EXEC(N'CREATE PARTITION SCHEME ps_ph_invoice_date AS PARTITION pf_ph_invoice_date ALL TO ([PRIMARY]);');

    DECLARE @maxBoundary DATE;

    SELECT @maxBoundary = MAX(CAST(prv.value AS DATE))
    FROM sys.partition_range_values prv
    JOIN sys.partition_functions pf ON pf.function_id = prv.function_id
    WHERE pf.name = 'pf_ph_invoice_date';

    IF @maxBoundary IS NULL SET @maxBoundary = @StartDate;

    DECLARE @next DATE = DATEADD(MONTH, 1, @maxBoundary);
    DECLARE @sqlSplit NVARCHAR(4000);

    WHILE @next <= @EndDate
    BEGIN
        SET @sqlSplit = N'ALTER PARTITION FUNCTION pf_ph_invoice_date() SPLIT RANGE (''' 
                      + CONVERT(NVARCHAR(10), @next, 120) + N''');';
        EXEC sp_executesql @sqlSplit;
        SET @next = DATEADD(MONTH, 1, @next);
    END

    DROP TABLE IF EXISTS dbo.ph_invoice_tb;

    CREATE TABLE dbo.ph_invoice_tb
    (
          [invoice_dtl_id] INT NOT NULL
        , [dtl_begin_date] DATETIME NULL
        , [serial] INT NULL
        , [item_id] NVARCHAR(20) NULL
        , [qty] DECIMAL(18,2) NULL
        , [price] NUMERIC NOT NULL
        , [discount] NUMERIC NULL
        , [line_cost_price] DECIMAL(18,6) NULL
        , [invoice_id] INT NOT NULL
        , [invoice_hdr_id] INT NOT NULL
        , [invoice_number] INT NULL
        , [invoice_date] DATETIME NULL
        , [document_id] NVARCHAR(5) NULL
        , [store_id] NVARCHAR(10) NULL
        , [account_id] NVARCHAR(20) NOT NULL
        , [Project_name] NVARCHAR(250) NULL
        , [Project_id] NVARCHAR(60) NULL
        , [hdr_begin_date] DATETIME NULL
        , [handling_cost] NUMERIC NULL
        , [trans_cost] NUMERIC NULL
        , [other_cost] NUMERIC NULL
        , [total_items_value] NUMERIC NULL
        , [store_name] NVARCHAR(4000) NULL
        , [store_code] NVARCHAR(4000) NULL
        , [document_name] NVARCHAR(50) NULL
        , [document_code] NVARCHAR(10) NULL
        , [document_stat] INT NULL
        , [account_type] NVARCHAR(25) NULL
        , [account_importance] NVARCHAR(10) NULL
        , [account_name] NVARCHAR(50) NULL
        , [sales_man_name] NVARCHAR(30) NULL
        , [account_begin_date] DATETIME NULL
        , [category_name] NVARCHAR(100) NULL
        , [Product_name] NVARCHAR(150) NULL
        , [category_id] NVARCHAR(10) NULL
        , [item_cost_price] DECIMAL(18,4) NULL
        , [item_key] NVARCHAR(10) NULL
        , [item_begin_date] DATETIME NULL
    ) ON ps_ph_invoice_date(invoice_date);

    INSERT INTO dbo.ph_invoice_tb
    SELECT
          pid.ID                          AS invoice_dtl_id
        , pid.begin_date                  AS dtl_begin_date
        , pid.serial
        , pid.item_id
        , pid.stock                       AS qty
        , pid.price
        , pid.discount
        , pid.cost_price                  AS line_cost_price
        , pid.invoice_id
        , pih.ID                          AS invoice_hdr_id
        , pih.invoice_number
        , pih.invoice_date
        , CAST(pih.document_id AS NVARCHAR(5))  AS document_id
        , CAST(pih.store_id    AS NVARCHAR(10)) AS store_id
        , CAST(pih.account_id  AS NVARCHAR(20)) AS account_id
        , pih.Project_name
        , pih.Project_id
        , pih.begin_date                  AS hdr_begin_date
        , pih.handling_cost
        , pih.trans_cost
        , pih.other_cost
        , pih.total_items_value
        , ps.store_name
        , ps.store_code
        , pd.document_name
        , pd.document_code
        , pd.stat                         AS document_stat
        , pa.account_type
        , pa.importance                   AS account_importance
        , pa.account_name
        , pa.sales_man_name
        , pa.Begin_Date                   AS account_begin_date
        , pi.category_name
        , pi.Product_name
        , pi.category_id
        , pi.cost_price                   AS item_cost_price
        , pi.item_key
        , pi.begin_date                   AS item_begin_date
    FROM ph_invoice_details pid
    JOIN ph_invoice_header  pih ON pih.ID = pid.invoice_id
    LEFT JOIN ph_stores     ps  ON ps.ID  = pih.store_id
    LEFT JOIN ph_documents  pd  ON pd.ID  = pih.document_id
    LEFT JOIN ph_accounts   pa  ON pa.ID  = pih.account_id
    LEFT JOIN ph_items      pi  ON pi.ID  = pid.item_id;

    CREATE CLUSTERED INDEX CIX_ph_invoice_tb_date_dtl
    ON dbo.ph_invoice_tb (invoice_date, invoice_dtl_id)
    ON ps_ph_invoice_date(invoice_date);

    CREATE NONCLUSTERED INDEX IX_ph_invoice_tb_store_date
    ON dbo.ph_invoice_tb (store_id, invoice_date)
    INCLUDE (item_id, document_id, account_id, qty, price, discount, total_items_value)
    ON ps_ph_invoice_date(invoice_date);

    CREATE NONCLUSTERED INDEX IX_ph_invoice_tb_item_date
    ON dbo.ph_invoice_tb (item_id, invoice_date)
    INCLUDE (store_id, document_id, account_id, qty, price, discount, line_cost_price)
    ON ps_ph_invoice_date(invoice_date);
END


CREATE  or alter PROCEDURE dbo.ph_fin_genrate_wh_data
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @StartDate DATE = '20170101';
    DECLARE @EndDate   DATE = '20330101';

    IF NOT EXISTS (SELECT 1 FROM sys.partition_functions WHERE name = 'pf_ph_invoice_date')
    BEGIN
        DECLARE @sql NVARCHAR(MAX) = N'CREATE PARTITION FUNCTION pf_ph_invoice_date (DATETIME) AS RANGE RIGHT FOR VALUES (';
        DECLARE @d DATE = DATEADD(MONTH, 1, @StartDate);

        WHILE @d <= @EndDate
        BEGIN
            SET @sql += N'''' + CONVERT(NVARCHAR(10), @d, 120) + N''',';
            SET @d = DATEADD(MONTH, 1, @d);
        END

        SET @sql = LEFT(@sql, LEN(@sql) - 1) + N');';
        EXEC sp_executesql @sql;
    END

    IF NOT EXISTS (SELECT 1 FROM sys.partition_schemes WHERE name = 'ps_ph_invoice_date')
        EXEC(N'CREATE PARTITION SCHEME ps_ph_invoice_date AS PARTITION pf_ph_invoice_date ALL TO ([PRIMARY]);');

    DECLARE @maxBoundary DATE;

    SELECT @maxBoundary = MAX(CAST(prv.value AS DATE))
    FROM sys.partition_range_values prv
    JOIN sys.partition_functions pf ON pf.function_id = prv.function_id
    WHERE pf.name = 'pf_ph_invoice_date';

    IF @maxBoundary IS NULL SET @maxBoundary = @StartDate;

    DECLARE @next DATE = DATEADD(MONTH, 1, @maxBoundary);
    DECLARE @sqlSplit NVARCHAR(4000);

    WHILE @next <= @EndDate
    BEGIN
        SET @sqlSplit = N'ALTER PARTITION FUNCTION pf_ph_invoice_date() SPLIT RANGE (''' 
                      + CONVERT(NVARCHAR(10), @next, 120) + N''');';
        EXEC sp_executesql @sqlSplit;
        SET @next = DATEADD(MONTH, 1, @next);
    END

    DROP TABLE IF EXISTS dbo.ph_fin_tb;

    CREATE TABLE dbo.ph_fin_tb
    (
          [ID] INT NULL
        , [document_name] NVARCHAR(50) NULL
        , [invoice_nmbr] INT NULL
        , [invoice_date] DATETIME NULL
        , [account_id] NVARCHAR(20) NULL
        , [account_name] NVARCHAR(50) NULL
        , [transaction_value] DECIMAL(18,4) NULL
        , [notes] NVARCHAR(500) NULL
        , [begin_Date] DATETIME NULL
        , [stat] INT NULL
        , [document_id] NVARCHAR(10) NOT NULL
    ) ON ps_ph_invoice_date(invoice_date);

    INSERT INTO dbo.ph_fin_tb
    (
          ID, document_name, invoice_nmbr, invoice_date, account_id, account_name
        , transaction_value, notes, begin_Date, stat, document_id
    )
    SELECT
          f.ID
        , f.document_name
        , f.invoice_nmbr
        , f.invoice_date
        , f.account_id
        , f.account_name
        , f.transaction_value
        , f.notes
        , f.begin_Date
        , f.stat
        , f.document_id
    FROM dbo.ph_fin f;

    CREATE CLUSTERED INDEX CIX_ph_fin_tb_date_id
    ON dbo.ph_fin_tb (invoice_date, ID)
    ON ps_ph_invoice_date(invoice_date);

    CREATE NONCLUSTERED INDEX IX_ph_fin_tb_acc_date
    ON dbo.ph_fin_tb (account_id, invoice_date)
    INCLUDE (transaction_value, document_id, stat, invoice_nmbr)
    ON ps_ph_invoice_date(invoice_date);

    CREATE NONCLUSTERED INDEX IX_ph_fin_tb_doc_date
    ON dbo.ph_fin_tb (document_id, invoice_date)
    INCLUDE (account_id, transaction_value, stat, invoice_nmbr)
    ON ps_ph_invoice_date(invoice_date);
END


 
create or alter function ph_data(@date1 date ,@date2 date)
returns table as return 
select 
 JSON_OBJECT(
        -- نستخدم JSON_QUERY لمنع تحويل المصفوفة إلى نص (Double Escaping)
        
        'goods': JSON_QUERY((
            SELECT * FROM ph_invoice_tb where invoice_date between @date1 and @date2 FOR JSON PATH
        )), 
   'money': JSON_QUERY((
            SELECT * FROM ph_fin_tb where invoice_date between @date1 and @date2 FOR JSON PATH
        ))
   
   ) as data
    
    

  