/**
 * Created by lailai on 2017/9/28.
 * 爬取歌手信息
 */
const async=require('async');
const superagent=require('superagent');
const cheerio=require('cheerio');

const query=require('../mysql');

const {
     singerConfig
    }=require('../config');

const singerCollect=()=>{
    console.log('爬取歌手开始...........');
    async.mapLimit(singerConfig.list,1,(item,cdItem)=>{
        async.mapLimit(singerConfig.queue,1,(obj,cdObj)=>{
            superagent.get(singerConfig.common+'?id='+item.id+'&initial='+obj.index)
            .then(res=>{
                    const $=cheerio.load(res.text);
                    const elems=$('li .s-fc0');
                    async.mapLimit(elems,1,(elem,cbElem)=>{
                        const href=$(elem).attr('href');
                        const text=$(elem).text();
                        query("insert into singer(name,url,type,category,letter,id,initial) values(?,?,?,?,?,?,?)", [text, href, item.title, item.category, obj.letter, item.id, obj.index], (err, resp) => {
                            if (err) {
                                // 说明重复了
                                query("update singer set url=?,type=?,category=?,letter=?,id=?,initial=? where name=?", [href, item.title, item.category, obj.letter, item.id, obj.index, text], (err, response) => {})
                            }
                        });
                        //当前歌手抓取完成，抓取下一个歌手
                        console.log(item.title+'\t'+obj.letter+'\t'+text+'\t'+'歌手抓取完成');
                        cbElem();
                    },()=>{
                        //当前字母的歌手抓取完成，回调，抓取下个字母的歌手
                        console.log(item.title+'\t'+obj.letter+'\t'+'字母的歌手抓取完成.............');
                        cdObj();
                    });
                });
        },()=>{
            //当前类型的A-Z类型的歌手抓取完成，抓取下个类型的歌手
            console.log(item.title+' 类型的歌手全部抓取完成*******************');
            cdItem();
        });
    },()=>{
        console.log('全部抓取完成..............');
    });
};

module.exports=singerCollect;