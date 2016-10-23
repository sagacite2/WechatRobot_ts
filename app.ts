import api = require('./api');
const list = require('../gzh_list');

const go = async () => {
    //   api.delete_all_gzh_record();//慎用
    await api.begin(list.gzh);
    console.log('完事！');
}
go();