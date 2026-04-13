const mongoose = require('mongoose');

const filterScheema = new mongoose.Schema({
    filter:[{type:String}],
    categoryId:{type:mongoose.Schema.Types.ObjectId,ref:'Category'},
    subCategoryId:{type:mongoose.Schema.Types.ObjectId},
})

module.exports=mongoose.model('Filter',filterScheema)
