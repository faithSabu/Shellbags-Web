var db = require('../config/connection');
var collection = require('../config/collection');
const { ReturnDocument, ObjectId } = require('mongodb');

module.exports = {
    addCoupon: (data) => {
        console.log(data);
        data.discount = parseInt(data.discount);
        data.minBuy = parseInt(data.minBuy);
        data.maxCap = parseInt(data.maxCap);
        return new Promise((resolve, reject) => {
            data.status = 'Active';
            data.usedCount = 0;
            db.get().collection(collection.COUPON_COLLECTION).insertOne(data).then((response) => {
                resolve(response)
            })
        })
    },
    getAllCoupons: () => {
        return new Promise(async (resolve, reject) => {
            let coupons = await db.get().collection(collection.COUPON_COLLECTION).find().toArray();
            resolve(coupons)
        })
    },
    getCoupon: (couponCode) => {
        return new Promise(async (resolve, reject) => {
            let coupon = await db.get().collection(collection.COUPON_COLLECTION).findOne({ couponCode: couponCode });
            resolve(coupon);
        })
    },
    checkCoupon: (userId, coupon, totalAmount) => {
        coupon.discount = parseInt(coupon.discount);
        coupon.minBuy = parseInt(coupon.minBuy);
        coupon.maxCap = parseInt(coupon.maxCap);
        totalAmount = parseInt(totalAmount)
        return new Promise(async (resolve, reject) => {
            let response = {};
            response.couponCode = coupon.couponCode;
            let todaysDate = new Date();
            let startDate = new Date(coupon.startDate);
            let endDate = new Date(coupon.endDate);

            // usedCoupon check
            let usedCoupon = await db.get().collection(collection.USER_COLLECTION).find({ _id: ObjectId(userId) }).project({ usedCoupon: 1, _id: 0 }).toArray()
            if(usedCoupon[0].usedCoupon ){
                var AppliedCoupons = usedCoupon[0].usedCoupon;
                for (var item of AppliedCoupons) {
                    if(item == coupon.couponCode){
                        response.couponUsed = true;
                        return resolve(response)
                    }
                }
            }
            // usedCoupon check

            if (coupon.status == 'Active') {
                if (startDate.setHours(0, 0, 0, 0) <= todaysDate.setHours(0, 0, 0, 0) && endDate.setHours(0, 0, 0, 0) >= todaysDate.setHours(0, 0, 0, 0)) {
                    // console.log('date');
                    if (totalAmount >= coupon.minBuy) {
                        let discount = parseInt(totalAmount * (coupon.discount / 100));
                        if (discount >= coupon.maxCap) {
                            response.newAmount = totalAmount - coupon.maxCap;
                        } else {
                            response.newAmount = totalAmount - discount;
                        }
                        // console.log('minBuy');
                    } else {
                        response.minBuy = coupon.minBuy
                        response.noMinBuy = true;
                        // console.log('minBuy else');
                    }
                } else {
                    response.inactive = true;
                    // console.log('start else');
                }

            } else {
                response.inactive = true;
            }
            resolve(response);
        })
    },
    addCouponToUser: (userId, couponCode) => {
        return new Promise(async (resolve, reject) => {
            let couponExist = await db.get().collection(collection.USER_COLLECTION).findOne({
                $and: [
                    { _id: ObjectId(userId) },
                    { usedCoupon: { $exists: true } }
                ]
            })
            if (couponExist) {
                db.get().collection(collection.USER_COLLECTION).updateOne({ _id: ObjectId(userId) },
                    {
                        $push: { usedCoupon: couponCode }
                    })
            }else {
                db.get().collection(collection.USER_COLLECTION).updateOne(
                    { _id: ObjectId(userId) },
                    {
                        $set:
                        {
                            usedCoupon: [couponCode]
                        }
                    }
                )
            }
        })
    },
    addUsedCouponCount: (couponCode) => {
        return new Promise(async (resolve, reject) => {
            db.get().collection(collection.COUPON_COLLECTION).updateOne({ couponCode: couponCode },
                {
                    $inc: { 'usedCount': 1 }
                })
        })
    }
}