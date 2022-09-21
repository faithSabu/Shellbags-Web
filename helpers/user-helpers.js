var db = require('../config/connection');
var collection = require('../config/collection');
const bcrypt = require('bcrypt');
const { response } = require('express');
var objectId = require('mongodb').ObjectId;
// const { body,check, validationResult } = require('express-validator');
const CC = require('currency-converter-lt');
const Razorpay = require('razorpay');
const paypal = require('paypal-rest-sdk');
const {resolve} = require('path');
// const {Promise} = require('mongodb');
const orderid = require('order-id')('key');
require('dotenv').config();

var instance = new Razorpay({
    key_id: process.env.KEY_ID,
    key_secret: process.env.KEY_SECRET,
});

paypal.configure({
    mode: "sandbox",
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET,
});


module.exports = {
    doSignup: (userData) => {
        return new Promise(async (resolve, reject) => {
            userData.password = await bcrypt.hash(userData.password, 10);
            db.get().collection(collection.USER_COLLECTION).insertOne(userData).then((data) => {
                resolve(data);
            })
        })
    },
    doLogin: (userData) => {
        return new Promise(async (resolve, reject) => {
            let loginStatus = false;
            let response = {};
            let user = await db.get().collection(collection.USER_COLLECTION).findOne({ email: userData.email })
            if (user) {
                if (user.block) {
                    response.block = true;
                    resolve(response);
                } else {
                    bcrypt.compare(userData.password, user.password).then((status) => {
                        if (status) {
                            console.log('login success');
                            response.user = user;
                            response.status = true;
                            resolve(response);
                        } else {
                            console.log('login failed');
                            resolve({ status: false });
                        }
                    })
                }
            } else {
                console.log('no user found');
                resolve({ status: false });
            }
        })
    },
    verifyMobile: (mobileNumber, userTrue) => {
        return new Promise(async (resolve, reject) => {
            let response = {};
            let user = false;
            user = await db.get().collection(collection.USER_COLLECTION).findOne({ mobile: mobileNumber })
            if (userTrue) {
                response.user = user;
                resolve(response);
            }
            if (user) {
                if (user.block) {
                    response.block = true;
                    resolve(response);
                } else {
                    response.status = true;
                    resolve(response);
                }
            } else {
                resolve({ noUser: true })
            }
        })
    },

    getAllUsers: () => {
        return new Promise(async (resolve, reject) => {
            let users = await db.get().collection(collection.USER_COLLECTION).find().toArray();
            resolve(users);
        })
    },
    blockUser: (userId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.USER_COLLECTION).updateOne({ _id: objectId(userId) }, {
                $set: {
                    block: true
                }
            }).then((response) => {
                resolve(response);
            })
        })
    },
    unblockUser: (userId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.USER_COLLECTION).updateOne({ _id: objectId(userId) }, {
                $set: {
                    block: false
                }
            }).then((response) => {
                resolve(response);
            })
        })
    },
    addToCart: (userId, prodId) => {
        let proObj = {
            item: objectId(prodId),
            quantity: 1
        }
        return new Promise(async (resolve, reject) => {
            let userCart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })
            if (userCart) {
                let proExist = userCart.products.findIndex(function (product) {
                    return product.item == prodId
                })
                // let proExist = userCart.products.findIndex(product => product.item == proId)
                if (proExist != -1) {
                    db.get().collection(collection.CART_COLLECTION).updateOne({ 'products.item': objectId(prodId) },
                        {
                            $inc: { 'products.$.quantity': 1 }
                        }).then(() => {
                            resolve();
                        })
                } else {
                    db.get().collection(collection.CART_COLLECTION).updateOne({ user: objectId(userId) },
                        {
                            $push: { products: proObj }
                        }).then((response) => {
                            resolve(response)
                        })
                }
            } else {
                cartObj = {
                    user: objectId(userId),
                    products: [proObj]
                }
                db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response) => {
                    resolve(response);
                })
            }
        })
    },
    getCartItems: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cartItems = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },

            ]).toArray()
            resolve(cartItems)
        })
    },
    getCartCount: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })
            let count = 0;
            if (cart) {
                count = cart.products.length
            }
            resolve(count);
        })
    },
    addToWishlist: (userId, prodId) => {
        return new Promise(async (resolve, reject) => {
            let wishlist = await db.get().collection(collection.WISHLIST_COLLECTION).findOne({ user: objectId(userId) })
            if (wishlist) {
                for (var item of wishlist.products) {
                    if (prodId == item) {
                        return resolve()
                    }
                }
                db.get().collection(collection.WISHLIST_COLLECTION).updateOne({ user: objectId(userId) },
                    {
                        $push: { products: objectId(prodId) }
                    }).then((response) => {
                        resolve(response)
                    })
            } else {
                wishlist = {
                    user: objectId(userId),
                    products: [objectId(prodId)]
                }
                db.get().collection(collection.WISHLIST_COLLECTION).insertOne(wishlist).then((response) => {
                    resolve(response);
                })
            }
        })
    },
    getWishlist: (userId) => {
        return new Promise(async (resolve, reject) => {
            let wishlist = await db.get().collection(collection.WISHLIST_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'products',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
            ]).toArray()
            resolve(wishlist)
        })
    },
    changeProductQuantity: (cartData) => {
        let count = parseInt(cartData.count);
        let quantity = parseInt(cartData.quantity);
        return new Promise((resolve, reject) => {
            if (quantity == 1 && count == -1) {
                db.get().collection(collection.CART_COLLECTION).updateOne({ '_id': objectId(cartData.cart) },
                    {
                        $pull: { products: { item: objectId(cartData.product) } }
                    })
                    // response.removeProduct = true;
                    .then(() => {
                        resolve({ removeProduct: true })
                    })
            }
            else {
                db.get().collection(collection.CART_COLLECTION).updateOne({ '_id': objectId(cartData.cart), 'products.item': objectId(cartData.product) },
                    {
                        $inc: { 'products.$.quantity': count }
                    }).then((data) => {
                        resolve(data);
                    })
            }
        })
    },
    getTotalAmount: (userId) => {
        return new Promise(async (resolve, reject) => {
            let total = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: { $multiply: [{ $toInt: '$quantity' }, { $toInt: { "$ifNull": ['$product.categoryOfferPrice', '$product.price'] } }] } }
                    }
                }
            ]).toArray()
            resolve(total[0])
        })
    },
    addAddress: (userAddress, userId) => {
        // userAddress._id = objectId(userId);
        return new Promise(async (resolve, reject) => {
            let Address = await db.get().collection(collection.USERADDRESS_COLLECTION).findOne({ _id: objectId(userId) })
            if (Address) {
                // userAddress.index = Address.addressList.length + 1;
                userAddress.indexId = objectId();
                db.get().collection(collection.USERADDRESS_COLLECTION).updateOne({ _id: objectId(userId) }, { $push: { addressList: userAddress } }).then(() => {
                    resolve(response);
                })
            } else {
                // userAddress.i0ndex = 1;
                userAddress.indexId = objectId();
                db.get().collection(collection.USERADDRESS_COLLECTION).insertOne({ _id: objectId(userId), addressList: [userAddress] }).then((response) => {
                    resolve(response);
                })
            }
        })
    },
    getCartItems_placeOrder: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cartItems = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        _id: 0,
                        item: 1,
                        quantity: 1,
                        orderPrice: {
                            $cond: {
                                if: { $eq: [ "", "$product.categoryOfferStatus" ] },
                                then: "$$REMOVE",
                                else: "$product.categoryOfferPrice"
                             }
                        },
                    }
                },
            ]).toArray()
            resolve(cartItems)
        })
    },
    deleteCart : (userId)=>{
        return new Promise(async(resolve,reject)=>{
            await db.get().collection(collection.CART_COLLECTION).deleteOne({ user: objectId(userId) }).then((response)=>{
                resolve(response)
            })
        })
    },
    getAddress: (userId) => {
        return new Promise(async (resolve, reject) => {
            let address = await db.get().collection(collection.USERADDRESS_COLLECTION).aggregate([
                {
                    $match: { _id: objectId(userId) }
                },
                {
                    $unwind: '$addressList'
                },

            ]).toArray()
            resolve(address)
        })
    },
    getSingleAddress: (userId, addressIndexId) => {
        return new Promise(async (resolve, reject) => {
            // let Address = await db.get().collection(collection.USERADDRESS_COLLECTION).findOne({ _id: objectId(userId) })
            let singleAddress = await db.get().collection(collection.USERADDRESS_COLLECTION).aggregate([
                {
                    $match: { _id: objectId(userId) }
                },
                {
                    $unwind: '$addressList'
                },
                {
                    $match: { 'addressList.indexId': objectId(addressIndexId) }
                }
            ]).toArray()
            resolve(singleAddress[0].addressList)
        })
    },
    placeOrder: (userId, orderedProducts, totalAmount, paymentMethod, deliveryDetails) => {
        return new Promise(async (resolve, reject) => {
            const orderId = orderid.generate();
            let status = paymentMethod === 'cod' || 'wallet' ? 'Order Placed' : 'pending'
            let orderObj = {
                userId: objectId(userId),
                orderedProducts: orderedProducts,
                totalAmount: totalAmount.total,
                paymentMethod: paymentMethod,
                deliveryDetails: deliveryDetails,
                status: status,
                orderId: orderId,
                date: new Date()
            }
            db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then(async (response) => {
                if(paymentMethod === 'cod' || 'wallet' ) {
                    let deleteResponse = await db.get().collection(collection.CART_COLLECTION).deleteOne({ user: objectId(userId) })
                }
                resolve(response.insertedId)
            })

        })
    },
    deletePendingOrder :()=>{
        return new Promise(async (resolve, reject) => {
            let Order = await db.get().collection(collection.ORDER_COLLECTION).deleteMany({ status: "pending" }).then((response) => {
                resolve(response);
              });
          });
    },
    generateRazorpay: (orderId, totalAmount) => {
        orderId = orderId.toString();
        return new Promise((resolve, reject) => {
            instance.orders.create({
                amount: (totalAmount.total) * 100,
                currency: "INR",
                receipt: orderId,
            }).then((response) => {
                resolve(response)
            })
        })
    },
    verifyPayment: (details) => {
        return new Promise((resolve, reject) => {
            const crypto = require("crypto");
            let hmac = crypto.createHmac('sha256', process.env.KEY_SECRET)

            hmac.update(details['response[razorpay_order_id]'] + '|' + details['response[razorpay_payment_id]'])
            hmac = hmac.digest('hex')

            if (hmac == details['response[razorpay_signature]']) {
                resolve()

            } else {
                reject()

            }
        })
    },
    changePaymentStatus: (orderId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectId(orderId) },
                {
                    $set: {
                        status: 'Order Placed'
                    }
                }).then(() => {
                    resolve();
                })
        })
    },
    priceConverter: (price) => {
        return new Promise((resolve, reject) => {

            let currencyConverter = new CC({
                from: "INR",
                to: "USD",
                amount: price,
                isDecimalComma: false,
            });
            currencyConverter.convert().then((response) => {
                resolve(response)
            });

        });
    },
    generatePaypal: (convertedPrice) => {
        return new Promise((resolve, reject) => {
            const create_payment_json = {
                intent: "sale",
                payer: {
                    payment_method: "paypal",
                },
                redirect_urls: {
                    return_url: "http://localhost:3000/user/paypalSuccess",
                    cancel_url: "http://localhost:3000/user/paypalCancel",
                },
                transactions: [
                    {
                        item_list: {
                            items: [
                                {
                                    name: "SHELLBAGS",
                                    sku: "001",
                                    price: "0",
                                    currency: "USD",
                                    quantity: 1,
                                },
                            ],
                        },
                        amount: {
                            currency: "USD",
                            total: convertedPrice,
                        },
                        description: "Best bags ever",
                    },
                ],
            };
            paypal.payment.create(create_payment_json, function (error, payment) {
                if (error) {
                    throw error;
                } else {
                    resolve(payment);
                }
            });
        });
    },
    getWalletAmount:(userId)=>{
                return new Promise((resolve,reject)=>{
                    db.get().collection(collection.WALLET_COLLECTION).findOne({userId:objectId(userId)}).then((data)=>{
                        if(data){
                            resolve(data.walletAmount)
                        }else{
                            resolve(false)
                        }
                    })
                })
            },
            checkWalletAmount:(userId,total)=>{
                return new Promise(async(resolve,reject)=>{
                    let walletStatus = {}
                    let walletAmount = await db.get().collection(collection.WALLET_COLLECTION).aggregate([
                        {
                            $match:{userId:objectId(userId)}
                        }
                    ]).toArray();
                    console.log(walletAmount[0]);
                    if(walletAmount[0]){
                        if(walletAmount[0].walletAmount< total){
                            walletStatus.insufficientBalance = true;
                            return resolve(walletStatus)
                        }else{
                            db.get().collection(collection.WALLET_COLLECTION).updateOne({userId:objectId(userId)},
                            {
                                $set:{walletAmount : walletAmount[0].walletAmount - parseInt(total)}
                            }).then((response)=>{
                                return resolve(response);
                            })
                        }
                        walletStatus.walletUpdated = true;
                        resolve(walletStatus)
                    }else{
                        walletStatus.insufficientBalance = true;
                        return resolve(walletStatus)
                    }
                })
            },
}





