var db = require('../config/connection');
var collection = require('../config/collection');
const { response } = require('express');
var objectId = require('mongodb').ObjectId;
var easyinvoice = require('easyinvoice');

module.exports = {
    addProducts: (products) => {
        return new Promise(async (resolve, reject) => {
            products.price = parseInt(products.price);
            products.stock = parseInt(products.stock);
            products.sold = 0;
            db.get().collection(collection.PRODUCT_COLLECTION).insertOne(products).then((data) => {
                resolve(data.insertedId);
            })
        })
    },
    getAllProducts: () => {
        return new Promise(async (resolve, reject) => {
            let products = await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray();
            resolve(products);
        })
    },
    getProduct: (productId) => {
        return new Promise((resolve, reject) => {
            if (productId != 'undefined') {
                db.get().collection(collection.PRODUCT_COLLECTION).findOne({ _id: objectId(productId) }).then((response) => {
                    resolve(response);
                })
            } else {
                resolve({ response: true })
            }
        })
    },
    getCategoryProducts: (categoryName) => {
        return new Promise(async (resolve, reject) => {
            let products = await db.get().collection(collection.PRODUCT_COLLECTION).find({ category: categoryName }).toArray();
            resolve(products);
        })
    },
    getFilteredProducts: (data) => {
        return new Promise(async (resolve, reject) => {

            let response = {};
            if (!data.subcategoryFilter && !data.brandFilter) {
                response.nothingSelected = true;
                resolve(response)
            }

            if (!data.subcategoryFilter) {
                if (!Array.isArray(data.brandFilter)) {
                    data.brandFilter = [data.brandFilter]
                }
                let products = await db.get().collection(collection.PRODUCT_COLLECTION).find(
                    {
                        $and: [
                            {category:data.category},
                            { brand: { $in: data.brandFilter } }
                        ]
                    }
                ).toArray()
                resolve(products)
            } else if (!data.brandFilter) {
                if (!Array.isArray(data.subcategoryFilter)) {
                    data.subcategoryFilter = [data.subcategoryFilter]
                }
                let products = await db.get().collection(collection.PRODUCT_COLLECTION).find(
                    {
                        $and: [
                            {category:data.category},
                            { subCategory: { $in: data.subcategoryFilter } }
                        ]
                    }
                ).toArray()
                resolve(products)
            } else {
                if (!Array.isArray(data.subcategoryFilter)) {
                    data.subcategoryFilter = [data.subcategoryFilter]
                }
                if (!Array.isArray(data.brandFilter)) {
                    data.brandFilter = [data.brandFilter]
                }
                let products = await db.get().collection(collection.PRODUCT_COLLECTION).find(
                    {
                        $and: [
                            {category:data.category},
                            { subCategory: { $in: data.subcategoryFilter } },
                            { brand: { $in: data.brandFilter } }
                        ]
                    }
                ).toArray()
                resolve(products)
            }
        })
    },
    editProduct: (productDetails, productId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).updateOne({ _id: objectId(productId) }, {
                $set: {
                    productName: productDetails.productName,
                    category: productDetails.category,
                    subCategory: productDetails.subCategory,
                    brand: productDetails.brand,
                    price: productDetails.price,
                    description: productDetails.description
                }
            }).then((response) => {
                resolve(response);
            })
        })
    },
    deleteProduct: (productId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).deleteOne({ _id: objectId(productId) }).then((response) => {
                resolve(response);
            })
        })
    },
    removeFromCart: (userId, prodId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CART_COLLECTION).updateOne({ user: objectId(userId) },
                {
                    $pull: { products: { item: objectId(prodId) } }
                })
                // response.removeProduct = true;
                .then((response) => {
                    resolve(response)
                })
        })
    },
    removeFromWishlist: (userId, prodId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.WISHLIST_COLLECTION).updateOne({ user: objectId(userId) },
                {
                    $pull: { products: objectId(prodId) }
                }
            ).then((response) => {
                resolve(response)
            })
        })
    },
    getOrdereHistory:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let orderHistory = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: { userId: objectId(userId) }
                },
            ]).toArray()
            resolve(orderHistory)
        })
    },
    getOrdereHistoryDetails: (orderId) => {
        return new Promise(async (resolve, reject) => {
            let orderedProducts = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: { _id: objectId(orderId) }
                },
                {
                   $unwind:'$orderedProducts'
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'orderedProducts.item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                // {
                //     $group:{
                //         _id: '$product',
       
                //     }
                // }
              
               
            ]).toArray()
            resolve(orderedProducts)
        })
    },
    cancelOrder:(data,userId)=>{
                return new Promise(async(resolve,reject)=>{
                    console.log('1111111111111111');
                    console.log(data);
                    if(data.paymentMethod == 'cod'){
                        let wallet = await db.get().collection(collection.WALLET_COLLECTION).findOne({userId:objectId(userId)})
                        if(wallet){
                            await db.get().collection(collection.WALLET_COLLECTION).updateOne({userId:objectId(userId)},
                            {
                                $set:{
                                    walletAmount : wallet.walletAmount+parseInt(data.orderAmount)
                                }
                            })
                        }else{
                            let newWallet = {
                                userId : objectId(userId),
                                walletAmount : parseInt(data.orderAmount)
                            }
                            await db.get().collection(collection.WALLET_COLLECTION).insertOne(newWallet)
                        }
                    }
        
                    db.get().collection(collection.ORDER_COLLECTION).updateOne({_id:objectId(data.orderId)},
            {
                $set:{status:'Cancelled'}
            }).then((response)=>{
                resolve(response)
            })
        })
    },
    invoice:(orderDetails)=>{
        return new Promise((resolve,reject)=>{
            let products = [];
            for(let i=0;i<orderDetails.length;i++){
                orderDetails[i].product[0].quantity = orderDetails[i].orderedProducts.quantity
                if(orderDetails[i].orderedProducts.orderPrice.toString()){
                    orderDetails[i].product[0].orderPrice = (orderDetails[i].orderedProducts.orderPrice.toString())
                }else{
                    orderDetails[i].product[0].orderPrice = orderDetails[i].product[0].price;
                }
                products.push(orderDetails[i].product)
        }
        var mergedProducts = [].concat.apply([], products);
        let productArray = mergedProducts.map(createInvoice);
        function createInvoice(item,orderDetails1){
            return {
            "quantity": item.quantity,
            "description": item.productName,
            "tax-rate": 0,
            "price": item.orderPrice}
          }
        
        var data = {
            // Your own data
            "sender": {
            "company": "SHELLBAGS",
            "zip": "Kochi",
            "city": "Kerala",
            "country": "India"
                
            },
            // Your recipient
            "client": {
            "company": orderDetails[0].deliveryDetails.firstName,
            "address": "Mob"+': '+orderDetails[0].deliveryDetails.phone,
            "zip": orderDetails[0].deliveryDetails.pinCode,
            "city": orderDetails[0].deliveryDetails.town,
            "country": orderDetails[0].deliveryDetails.state
            },
            "information": {
                "number": "OD-1791",
                "date": orderDetails[0].date.toISOString().substring(0, 10),
                "due-date": "Not applicable"
            },
            "products":productArray,
            // Settings to customize your invoice
            "settings": {
                "currency": "INR", // See documentation 'Locales and Currency' for more info. Leave empty for no currency.
                // "locale": "nl-NL", // Defaults to en-US, used for number formatting (See documentation 'Locales and Currency')
                // "tax-notation": "gst", // Defaults to 'vat'
                // "margin-top": 25, // Defaults to '25'
                // "margin-right": 25, // Defaults to '25'
                // "margin-left": 25, // Defaults to '25'
                // "margin-bottom": 25, // Defaults to '25'
                // "format": "A4", // Defaults to A4, options: A3, A4, A5, Legal, Letter, Tabloid
                // "height": "1000px", // allowed units: mm, cm, in, px
                // "width": "500px", // allowed units: mm, cm, in, px
                // "orientation": "landscape", // portrait or landscape, defaults to portrait
            },
        };
        resolve(data)
    })
    }

}

