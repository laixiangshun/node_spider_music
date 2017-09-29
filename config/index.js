/**
 * Created by lailai on 2017/9/28.
 */
const database=require('./mysql');
const singerConfig=require('./singer');
const songConfig=require('./song');
module.exports={
    database,
    singerConfig,
    songConfig
};