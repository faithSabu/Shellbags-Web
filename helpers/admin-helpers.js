var db = require('../config/connection');
var collection = require('../config/collection');
const bcrypt = require('bcrypt');
const { response } = require('express');
var objectId = require('mongodb').ObjectId;

module.exports = {
    addAdmin: (adminData) => {
        return new Promise(async (resolve, reject) => {
            adminData.password = await bcrypt.hash(adminData.password, 10);
            db.get().collection(collection.ADMIN_DATA).insertOne(adminData).then((data) => {
                resolve(data);
            })
        })
    },
    getAdmin: (data) => {
        return new Promise(async (resolve, reject) => {
            let response = {};
            let admin = await db.get().collection(collection.ADMIN_DATA).findOne({ userName: data.userName })
            if (admin) {
                bcrypt.compare(data.password, admin.password).then((status) => {
                    if (status) {
                        response.status = true;
                        resolve(response);
                    } else {
                        resolve({ status: false });
                    }
                })
            } else {
                console.log('no user found');
                resolve({ status: false });
            }


        })

    },
    getPaymentMethodNums: (paymentMethod) => {
        return new Promise(async (resolve, reject) => {
            let response = await db.get().collection(collection.ORDER_COLLECTION).aggregate(
                [
                    {
                        $match: {
                            paymentMethod: paymentMethod
                        }
                    },
                    {
                        $count: "count"
                    }
                ]
            ).toArray();
            resolve(response);

        })
    },
    getRevenue: (unit, count) => {
        return new Promise(async (resolve, reject) => {

            let response = db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match:
                    {
                        $expr: {
                            $gt: ["$date", {
                                $dateSubtract:
                                    { startDate: "$$NOW", unit: unit, amount: count }
                            }]
                        }
                    }
                },
                { $group: { _id: null, sum: { $sum: '$totalAmount' } } },
            ]).toArray()
            resolve(response);

        })
    },
    totalRevenueByMonth: (selectdYear) => {
        return new Promise(async (resolve, reject) => {
            let monthlyRevenue = [];
            for (let i = 1; i <= 12; i++) {
                let a = await db.get().collection(collection.ORDER_COLLECTION).aggregate([{
                    $match:
                    {
                        $expr:
                        {
                            "$eq": [{ "$year": "$date" },
                                selectdYear
                            ]
                        }
                    }
                },
                {
                    $group:
                    {
                        _id: {
                            "$eq":
                                [{ "$month": "$date" }, i]
                        },
                        revenue: { $sum: '$totalAmount' }
                    }
                },
                {
                    $match: { _id: true }
                },
                {
                    $project: { revenue: 1, _id: 0 }
                }
                ]).toArray();
                // monthlyRevenue.push(a)
                // monthlyRevenue.i = a; // only one
                monthlyRevenue.push([a[0]]);
                // monthlyRevenue[i] = a;  //not good

            }
            console.log(monthlyRevenue);
            resolve(monthlyRevenue)
        })
    },
    getRecentOrders: () => {
        return new Promise(async(resolve, reject) => {
            let recentOrders = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: {  }
                },
                {
                    $lookup: {
                        from: collection.USER_COLLECTION,
                        localField: 'userId',
                        foreignField: '_id',
                        as: 'user'
                    }
                },
                {
                    $project:{
                        orderedProducts:1,
                        totalAmount:1,
                        paymentMethod:1,
                        status:1,
                        date:1,
                        user:1,
                        orderId:1

                    }
                }
            ]).toArray()
            resolve(recentOrders)
        })
    },
    changeOrderStatus: (data)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.ORDER_COLLECTION).updateOne({_id:objectId(data.orderId)},
            {
                $set:{status:data.newStatus}
            }).then((response)=>{
                resolve(response)
            })
        })
    }
}












