###### TEDx-Load-Aggregate-Model ######

import sys
import json
import pyspark
from pyspark.sql.functions import col, collect_list, struct

from awsglue.transforms import *
from awsglue.utils import getResolvedOptions
from pyspark.context import SparkContext
from awsglue.context import GlueContext
from awsglue.job import Job
from awsglue.dynamicframe import DynamicFrame


##### FROM FILES
tedx_dataset_path = "s3://unibg-data-2021-1059865/tedx_dataset.csv"


###### READ PARAMETERS
args = getResolvedOptions(sys.argv, ['JOB_NAME'])


##### START JOB CONTEXT AND JOB
sc = SparkContext()


glueContext = GlueContext(sc)
spark = glueContext.spark_session


job = Job(glueContext)
job.init(args['JOB_NAME'], args)


#### READ INPUT FILES TO CREATE AN INPUT DATASET
tedx_dataset = spark.read \
    .option("header","true") \
    .option("quote", "\"") \
    .option("escape", "\"") \
    .option("multiline", "true") \
    .csv(tedx_dataset_path)
    
tedx_dataset.printSchema()


#### FILTER ITEMS WITH NULL POSTING KEY
count_items = tedx_dataset.count()
count_items_null = tedx_dataset.filter("idx is not null").count()

print(f"Number of items from RAW DATA: {count_items}")
print(f"Number of items from RAW DATA with NOT NULL KEY: {count_items_null}")


## READ TAGS DATASET
tags_dataset_path = "s3://unibg-data-2021-1059865/tags_dataset.csv"
tags_dataset = spark.read.option("header","true").csv(tags_dataset_path)


# CREATE THE AGGREGATE MODEL, ADD TAGS TO TEDX_DATASET
tags_dataset_agg = tags_dataset.groupBy(col("idx").alias("idx_ref_tags")).agg(collect_list("tag").alias("tags"))
tags_dataset_agg.printSchema()

tedx_dataset_agg = tedx_dataset.join(tags_dataset_agg, tedx_dataset.idx == tags_dataset_agg.idx_ref_tags, "left") \
    .drop("idx_ref_tags") \
    .select(col("idx").alias("_id"), col("*")) \
    .drop("idx")

tedx_dataset_agg.printSchema()


## READ WATCH_NEXT DATASET
watch_next_dataset_path = "s3://unibg-data-2021-1059865/watch_next_dataset.csv"
watch_next_dataset_raw = spark.read.option("header","true").csv(watch_next_dataset_path)
watch_next_dataset = watch_next_dataset_raw.drop_duplicates().where('url != "https://www.ted.com/session/new?context=ted.www%2Fwatch-later"')

print(f"Number Watch_Next items (RAW): {watch_next_dataset_raw.count()}")
print(f"Number Watch_Next items: {watch_next_dataset.count()}")


# ADD WATCH_NEXT TO AGGREGATE MODEL
watch_next_dataset_agg = watch_next_dataset.groupBy(col("idx").alias("idx_ref_watch_next")).agg(collect_list("watch_next_idx").alias("watch_next"))
watch_next_dataset_agg.printSchema()

tedx_dataset_agg = tedx_dataset_agg.join(watch_next_dataset_agg, tedx_dataset_agg._id == watch_next_dataset_agg.idx_ref_watch_next, "left") \
    .drop("idx_ref_watch_next")
    
tedx_dataset_agg.printSchema()

mongo_uri = "mongodb://cluster-tcm-2021-shard-00-00.8qyyp.mongodb.net:27017,cluster-tcm-2021-shard-00-01.8qyyp.mongodb.net:27017,cluster-tcm-2021-shard-00-02.8qyyp.mongodb.net:27017"

write_mongo_options = {
    "uri": mongo_uri,
    "database": "unibg_tedx_2021",
    "collection": "tedx_data",
    "username": "admin",
    "password": "admin123",
    "ssl": "true",
    "ssl.domain_match": "false"}

tedx_dataset_dynamic_frame = DynamicFrame.fromDF(tedx_dataset_agg, glueContext, "nested")
glueContext.write_dynamic_frame.from_options(tedx_dataset_dynamic_frame, connection_type="mongodb", connection_options=write_mongo_options)


###### Gerry ######

## READ TRANSCRIPT DATASET
transcript_dataset_path = "s3://unibg-data-2021-1059865/transcript_dataset.csv"
transcript_dataset = spark.read.option("header","true").csv(transcript_dataset_path)


# ADD TRANSCRIPT TO AGGREGATE MODEL
transcript_dataset_agg = transcript_dataset.groupBy(col('idx').alias('idx_ref_transcript')).agg(collect_list(struct("timestamp", "sentence")).alias("transcript"))
transcript_dataset_agg.printSchema()


gerry_dataset = tedx_dataset_agg.join(transcript_dataset_agg, tedx_dataset_agg._id == transcript_dataset_agg.idx_ref_transcript) \
    .drop("idx_ref_transcript")
    
gerry_dataset.printSchema()


write_mongo_options_gerry = {
    "uri": mongo_uri,
    "database": "unibg_tedx_2021",
    "collection": "gerry_data",
    "username": "admin",
    "password": "admin123",
    "ssl": "true",
    "ssl.domain_match": "false"}
    
gerry_dataset_dynamic_frame = DynamicFrame.fromDF(gerry_dataset, glueContext, "nested")
glueContext.write_dynamic_frame.from_options(gerry_dataset_dynamic_frame, connection_type="mongodb", connection_options=write_mongo_options_gerry)

