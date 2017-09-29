/**
 * Created by lailai on 2017/9/28.
 * 抓取歌曲信息
 */

const superagent=require('superagent');
const cheerio=require('cheerio');
const moment=require('moment');
const async=require('async');
const request=require('request');
const notifier=require('node-notifier');

const query=require('../mysql');
const {
        singerConfig,
        songConfig
    }=require('../config');
const {
    limitLength,
    splitId,
    notify
    }=require('../util');

let minSInger=0;
const songCollect=()=>{
    console.log('抓取歌曲开始*********************');
    //query('select min(singer) from singer',[],(err,res,response)=>{
    //    if(!err){
    //        minSInger=res[0]['min(singer)'];
    //    }else{
    //        console.log('获取歌手id出错**********');
    //    }
    //});
    query('select max(singer) from song',[],(err,res,rs)=>{
        let index=res[0]['max(singer)'] || 31345;
        async.whilst(()=>{
            return index<=62609;
        },(cb)=>{
            //从数据库遍历歌手姓名和url，获取歌手歌曲
            query('select s.name,url from singer s where s.singer=?',[index],(err,res)=>{
                console.log(index+'-----------开始抓取');
                if(!err && res.length>0){
                    const singer={
                        name: res[0].name,
                        url: res[0].url.trim()
                    };
                    superagent(songConfig.common+singer.url)
                    .then(res=>{
                            const $=cheerio.load(res.text);
                            const content = $('#song-list-pre-cache textarea');
                            //console.log('&&&&&&&&&&&&&&&&&&&&&'+$(content).text());
                            //该歌手没有歌曲的情况直接抓取下个歌手的歌曲
                            if(content==null || content=='undefined' || content==''){
                               console.log(singer.name+'\t'+'暂无音乐*************');
                                notify('暂无音乐',singer.name+'暂无音乐');
                                index++;
                                cb();
                            }
                            const song=JSON.parse($(content).text());
                            limitLength(song,songConfig.len);
                            async.mapLimit(song,1,(item,cbItem)=>{
                                // 遍历热门前N首歌曲 并且获取评论数量
                                const href='/song?id='+item.id;
                                const id=item.commentThreadId;
                                const name=item.name;
                                const url = songConfig.comment + id + '?csrf_token=';
                                songConfig.req.url=url;
                                request(songConfig.req,(err,res,body) =>{
                                    if(body){
                                        const content=JSON.parse(body);
                                        const comment=content.total;
                                        query('insert into song(title,comment,url,name,singer) values(?,?,?,?,?)',[name,comment,href,singer.name,index],(err,res)=>{
                                            if(err){
                                                query('update song set title=?,comment=?,name=?,singer=? where url=?',[name,comment,singer.name,index,href],(err,response)=>{});
                                            }
                                            cbItem();
                                        });
                                    }else{
                                        console.log('未知错误');
                                        notify('错误','未知错误');
                                        cbItem();
                                    }
                                })
                            },()=>{
                                console.log('歌手\t'+singer.name+'\t抓取完成');
                                index++;
                                cb();
                            })
                        })
                    .catch(err=>{
                            //错误处理
                            const errStr=err.toString();
                            if(errStr.includes('innerHTML')){
                                //页面404直接跳到下一个歌手
                                console.log(err,singer.name+'页面丢失,请求的url为'+songConfig.common+singer.url);
                                notify('请求超时',singer.name+'页面丢失，请求的url为'+songConfig.common+singer.url);
                                index++;
                            }else{
                                //goto超时处理，或者503
                                console.log(err,singer.name+'请求超时，即将重新请求，请求的url为'+songConfig.common+singer.url);
                                notify('请求超时',singer.name+'请求超时，即将重新请求，请求的url为'+songConfig.common+singer.url);
                            }
                            cb();
                        })
                }else{
                    //查询错误处理
                    console.log(err,'singer ID '+index+'查询出错了');
                    notify('数据库查询错误','singer ID '+index);
                    index++;
                    cb();
                }
            })
        });
    })
};
module .exports=songCollect;