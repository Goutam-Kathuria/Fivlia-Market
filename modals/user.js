const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
    name:String,
    password:{type:String},
    mobileNumber:{type:String},
    email:{type:String},
    adharCardNumber:Number,
    fcmToken:String,
    latitude:Number,
    longitude:Number,
    image:String
},{timestamps:true})
module.exports=mongoose.model('User',userSchema)
