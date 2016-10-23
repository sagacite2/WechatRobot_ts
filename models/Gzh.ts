import mongoose = require('mongoose');

interface IGzhModel {
    gzh_name: String;
    weixin_id: String;
    introduce: String;
    qrcode_img: String;
    url: String;
    cover_img: String;
    page: Number;
}
export interface IGzh extends IGzhModel, mongoose.Document { }

const GzhSchema = new mongoose.Schema({
    gzh_name: { type: String },//公众号的中文名字
    weixin_id: { type: String },//公众号绑定的微信号，一般用这个做唯一标识
    introduce: { type: String },
    qrcode_img: { type: String },//二维码地址
    url: { type: String },//chuansong.me中的地址
    cover_img: { type: String },//封面、头像地址
    page: { type: Number },//最后一页的页码
});

export const Gzh = mongoose.model<IGzh>("Gzh", GzhSchema);
