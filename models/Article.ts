
import mongoose = require('mongoose');

interface IArticleModel {
    title: String;
    url: String;
    author: String;
    gzh_id: mongoose.Schema.Types.ObjectId;
    chuansong_id: Number;
    text: String;
    read_count: Number;
    like_count: Number;
    publish_at: Date;
    catch_at: Date;
}
export interface IArticle extends IArticleModel, mongoose.Document { }

const ArticleSchema = new mongoose.Schema({
    title: { type: String },
    url: { type: String },
    author: { type: String },
    gzh_id: { type: mongoose.Schema.Types.ObjectId },
    chuansong_id: { type: Number },
    text: { type: String },//含html代码的文章文本内容
    read_count: { type: Number },//阅读数
    like_count: { type: Number },//点赞数
    publish_at: { type: Date },//该文章在该公众号上的发表时间
    catch_at: { type: Date, default: Date.now }//抓取到该文章的时间
});
ArticleSchema.index({ chuansong_id: 1 });

export const Article = mongoose.model<IArticle>("Article", ArticleSchema);
