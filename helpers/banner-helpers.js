var db = require('../config/connection');
var collection = require('../config/collection');
const { response } = require('express');
var objectId = require('mongodb').ObjectId;

module.exports = {
    addBanner: (data) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.BANNER_COLLECTION).insertOne(data).then((response)=>{
                resolve(response);
            })
        })
    },
    getBanner:()=>{
        return new Promise(async(resolve,reject)=>{
            let banner = await db.get().collection(collection.BANNER_COLLECTION).find().toArray();
            resolve(banner)
        })
    },
    getSingleBanner:(bannerId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.BANNER_COLLECTION).findOne({_id:objectId(bannerId)}).then((bannerData)=>{
                resolve(bannerData)
            })
        })
    },
    editBanner:(data)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.BANNER_COLLECTION).updateOne({_id:objectId(data.bannerId)},
            {
                $set:{
                    bannerHeading:data.bannerHeading,
                    bannerDescription:data.bannerDescription,
                    image:data.image
                }
            }).then((response)=>{
                resolve(response)
            })
        })
    },
    deleteBanner:(bannerId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.BANNER_COLLECTION).deleteOne({_id: objectId(bannerId)}).then((response)=>{
                resolve(response)
            })
        })
    }
}