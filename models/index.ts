import * as mongoose from 'mongoose';

mongoose.connect('mongodb://127.0.0.1/weixin_gzh_data', {
    server: { poolSize: 20 }
}, function (err) {
    if (err) {
        process.exit(1);
    }
});

export { Article, IArticle } from './Article';
export { Gzh, IGzh } from './Gzh';