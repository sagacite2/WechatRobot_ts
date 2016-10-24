import * as models from './models';
import * as superagent from 'superagent';
import * as cheerio from 'cheerio';
import * as helper from './modules/helper';
const Gzh = models.Gzh;
const Article = models.Article;
const debug = true;
function log(s: string) {
    if (debug) {
        console.log(s);
    }
}
console.log('干活！');
const retries = 3;
let current_retry = 3;
let retrying = false;
export const begin = async (gzh_list: Array<string>) => {
    await updateGzh(gzh_list);
    await get_all(gzh_list);
}

/** 通过微信号列表，获取对应的公众号信息（从chuansong.me里抓）*/
export const updateGzh = async (gzh_list: Array<string>) => {
    gzh_list.forEach(async (item) => {
        await updateGzh_item(item);
    })
}

/**遍历抓取n个公众号下的所有文章 */
export const get_all = async (gzh_list: string[]) => {
    for (let i = 0; i < gzh_list.length; i++) {
        await get_all_article(gzh_list[i]);
    }
}

async function updateGzh_item(weixin_id: string) {
    //看看数据库有没有对应weixin_id的公众号记录
    const gzh = await Gzh.findOne({ 'weixin_id': weixin_id });
    if (!gzh) {
        const url = get_list_url(weixin_id);
        let res: superagent.Response;
        try {
            res = await remote_get(url);
        } catch (e) {
            return;
        }
        const $ = cheerio.load(res.text);
        let gzh = new Gzh();
        const arr = $('meta[name="description"]').first().attr('content').split(',');
        [gzh.gzh_name, gzh.weixin_id, gzh.introduce] = arr;
        gzh.qrcode_img = 'http://q.chuansong.me/' + weixin_id + '.jpg';
        gzh.cover_img = 'http://h.chuansong.me/' + weixin_id + '.jpg';

        gzh.save((err, product, numAffected) => {
            if (!err && numAffected > 0) {
                console.log('添加了公众号: 【' + weixin_id + '】, 中文名:【' + gzh.gzh_name + '】, 简介：' + gzh.introduce);
            } else {
                console.log(err);
            }
        });
    } else {
        console.log('公众号: ' + weixin_id + ' 在数据库中已经存在，无须添加。');
    }
}

/** 抓取某个公众号下文章列表中最后一页的页码*/
export const get_page_number = async (weixin_id: string) => {
    const url = get_list_url(weixin_id);
    let res: superagent.Response;
    try {
        res = await remote_get(url);
    } catch (e) {
        console.log('抓取页码失败！');
        return;
    }
    const $ = cheerio.load(res.text);
    let last_page = $('span[style="font-size: 1em;font-weight: bold"]').find('a').last().text().trim();
    if (last_page === "") {
        last_page = "0";
    }
    return parseInt(last_page);
}

/**抓取某公众号下所有列表页的分页链接 */
export const get_list_pages = async (gzh: models.IGzh) => {
    const last_page = await get_page_number(gzh.weixin_id.toString());
    //判断是否只抓取第一页，根据数据库已有的数据量来估算
    const article_count = await Article.count({ 'gzh_id': gzh._id }).exec();
    console.log('数据库中已有公众号：' + gzh.weixin_id.toString() + '的' + article_count + '条文章记录！');
    if (article_count > (last_page - 1) * 12) {
        return [get_list_url(gzh.weixin_id.toString())];
    } else {
        let pages: Array<string> = [];
        for (let i = 0; i <= last_page; i++) {
            pages.push(get_list_url(gzh.weixin_id.toString(), i * 12));
        }
        return pages;
    }
}


/** 删除gzh表中的所有数据*/
export const delete_all_gzh_record = async () => {
    await Gzh.remove({});
}

/** 删除gzh表中指定的一个公众号（用绑定微信号来查询）*/
export const delete_a_gzh = async (weixin_id: string) => {
    await Gzh.remove({ 'weixin_id': weixin_id });
}

/** 通过绑定微信号获得一条公众号数据*/
export const get_a_gzh = async (weixin_id: string) => {
    const gzh = await Gzh.findOne({ 'weixin_id': weixin_id });
    return gzh;
}
/** 抓取某个列表页的所有文章链接*/
export const get_article_urls = async (url: string) => {
    let urls: string[] = [];
    let res: superagent.Response;
    try {
        res = await remote_get(url);
    } catch (e) {
        console.log('抓取页码失败！');
        return;
    }

    const $ = cheerio.load(res.text);
    $('.feed_item_question').each(async (index, element) => {
        urls.push('http://chuansong.me' + $(element).find('.question_link').first().attr('href'));
    });

    return urls;
}
/** 遍历列表页分页链接数组，抓取所有文章链接*/
export const get_all_article_urls = async (gzh: models.IGzh) => {
    let urls: string[] = await get_list_pages(gzh);

    let all_article_urls: string[] = [];
    for (let i = 0; i < urls.length; i++) {
        let article_urls = await get_article_urls(urls[i]);
        all_article_urls = all_article_urls.concat(article_urls);
    }
    return all_article_urls;
}

/**抓取文章内容 */
export const get_article = async (url: string, gzh: models.IGzh) => {
    //http://chuansong.me/n/665483052538
    let chuansong_id = parseInt(url.slice(url.lastIndexOf('/') + 1));
    let existed = await get_article_by_chuansong_id(chuansong_id);
    if (existed === 0) {
        let res: superagent.Response;
        try {
            res = await remote_get(url);
        } catch (e) {
            console.log('抓取页码失败！');
            return;
        }

        let $ = cheerio.load(res.text);
        let article = new Article();
        article.text = $('.rich_media_content').first().html();
        article.title = $('.rich_media_title').first().text().trim();
        article.author = gzh.gzh_name;
        article.gzh_id = gzh._id;
        article.like_count = 0;
        article.url = url;
        article.read_count = 0;
        article.publish_at = new Date();
        article.chuansong_id = chuansong_id;
        article.save(function (err, product, numAffected) {
            if (err) {
                console.log(err);
            } else {
                console.log('添加了文章：' + article.title);
            }
        });
    } else {
        console.log('文章已经在数据库中存在，无需添加：' + url)
    }
}

/**抓取某个公众号下的所有文章内容 */
export const get_all_article = async (weixin_id: string) => {
    let gzh = await get_a_gzh(weixin_id);
    let urls = await get_all_article_urls(gzh);

    for (let i = 0; i < urls.length; i++) {
        await get_article(urls[i], gzh);
    }
}

/**根据chuansong_id寻找文章 */
export const get_article_by_chuansong_id = async (chuansong_id: number) => {
    return Article.count({ 'chuansong_id': chuansong_id }).exec();
}

async function remote_get(url: string) {
    //每次请求都先稍等一下
    await helper.wait_seconds(2);
    const promise = new Promise<superagent.Response>(function (resolve, reject) {
        log('get:' + url);

        superagent.get(url)
            .end(async function (err, res) {

                log('got:' + url);
                if (!err) {
                    retrying = false;
                    current_retry = retries;
                    log('bytes:' + res.text.length);

                    resolve(res);
                } else {
                    console.log(err);
                    if (retrying && current_retry === 0) {
                        retrying = false;
                        current_retry = retries;
                        reject(err);
                    } else {
                        log('retry...(' + current_retry + ')')
                        retrying = true;
                        current_retry--;
                        resolve(await remote_get(url));
                    }
                }
            });
    });
    return promise;
}

function get_index_url(weixin_id: string) {
    return 'http://chuansong.me/account/' + weixin_id;
}

function get_content_url(id: string) {
    return 'http://chuansong.me/n/' + id;
}

function get_list_url(weixin_id: string, page?: Number) {
    if (!page) {
        page = 0;
    }
    return 'http://chuansong.me/account/' + weixin_id + '?start=' + page;
}