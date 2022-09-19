var db = require('../config/connection');
var collection = require('../config/collection');
const { response } = require('express');
var objectId = require('mongodb').ObjectId;

module.exports = {
    getBrand: () => {
        return new Promise(async (resolve, reject) => {
            let brand = await db.get().collection(collection.BRAND_COLLECTION).find().toArray();
            resolve(brand[0].brand);
        })
    },
    getAllCategories: () => {
        return new Promise(async (resolve, reject) => {
            let categories = await db.get().collection(collection.CATEGORY_COLLECTION).find().toArray();
            resolve(categories);
        })
    },
    getOneCategory: (categoryId) => {
        return new Promise(async (resolve, reject) => {
            let category = await db.get().collection(collection.CATEGORY_COLLECTION).findOne({ _id: objectId(categoryId) })
            resolve(category);
        })
    },
    updateCategory: (data) => {
        return new Promise(async (resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).updateMany({ category: data.category },
                {
                    $set: {
                        category: data.newCategory
                    }
                }).then(() => {
                    db.get().collection(collection.CATEGORY_COLLECTION).updateOne({ category: data.category },
                        {

                            $set: {
                                category: data.newCategory
                            }

                        }).then(() => {
                            resolve()
                        })

                })
        })
    },
    addCategory: (newCategory) => {
        return new Promise(async (resolve, reject) => {
            newCategory.categoryOffer = parseInt(newCategory.categoryOffer)
            if (!Array.isArray(newCategory.subCategory)) {
                newCategory.subCategory = [newCategory.subCategory]
            }
            db.get().collection(collection.CATEGORY_COLLECTION).insertOne(newCategory).then((data) => {
                resolve(data.insertedId);
            })
        })
    },
    addSubcategory: (data) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CATEGORY_COLLECTION).updateOne({ category: data.category },
                {
                    $push: { subCategory: data.newSubCategory }
                }).then((response) => {
                    resolve(response);
                })

        })
    },
    editSubcategory: (data) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CATEGORY_COLLECTION).updateMany(
                { category: data.category },
                { $set: { "subCategory.$[element]": data.editedSubCategory } },
                { arrayFilters: [{ element: data.subcategory }] }).then((response) => {

                    db.get().collection(collection.PRODUCT_COLLECTION).updateMany(
                        {
                            $and: [
                                { category: data.category },
                                { subCategory: data.subcategory }
                            ]
                        }, { $set: { subCategory: data.editedSubCategory } }
                    ).then((response) => {
                        resolve(response);
                    })
                })
        })
    },
    deleteSubcategory: (data) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CATEGORY_COLLECTION).updateOne(
                { category: data.category },
                { $pull: { subCategory: data.subcategory } }
            ).then(() => {
                db.get().collection(collection.PRODUCT_COLLECTION).deleteMany({
                    $and: [
                        { category: data.category },
                        { subCategory: data.subcategory }
                    ]
                }).then(() => {
                    resolve();
                })
            })
        })
    },
    getSubCategory: (category) => {
        return new Promise(async (resolve, reject) => {
            let subCategory = await db.get().collection(collection.CATEGORY_COLLECTION).aggregate(
                [{ $match: { category: category } }, { $unwind: "$subCategory" }, { $project: { subCategory: 1 } }]
            ).toArray();
            resolve(subCategory);
        })



        // db.get().collection(collection.CATEGORY_COLLECTION).aggregate(
        //     [{$match:{category:"Travel"}},{$unwind:"$subCategory"},{$project:{"subCategory":1}}]
        // )
    },
    deleteCategory: (category) => {
        return new Promise(async (resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).deleteMany({ category: category }).then(() => {
                db.get().collection(collection.CATEGORY_COLLECTION).deleteOne({ category: category }).then((response) => {
                    resolve(response);
                })
            })
        })
    },
    addCategoryOffer: (data) => {
        return new Promise(async (resolve, reject) => {
            data.newCategoryOffer = parseInt(data.newCategoryOffer)
            await db.get().collection(collection.CATEGORY_COLLECTION).updateOne(
                { category: data.category },
                {
                    $set: {
                        categoryOffer: data.newCategoryOffer,
                        categoryOfferStatus: true
                    }
                }
            ).then(async () => {
                let products = await db.get().collection(collection.PRODUCT_COLLECTION).find({ category: data.category }).toArray();
                products.map(addCategoryOffer);

                async function addCategoryOffer(product) {
                    let offerPrice = parseInt(product.price - (product.price * (data.newCategoryOffer / 100)));
                    await db.get().collection(collection.PRODUCT_COLLECTION).updateOne({ _id: product._id }, {
                        $set: {
                            categoryOffer: data.newCategoryOffer,
                            categoryOfferPrice: offerPrice,
                            categoryOfferStatus: true
                        }
                    }).then((response) => {
                        resolve(response)
                    })
                }
            })
        })
    },
    deleteCategoryOffer: (category) => {
        return new Promise(async (resolve, reject) => {
            await db.get().collection(collection.CATEGORY_COLLECTION).updateOne(
                { category: category },
                {
                    $unset: {
                        categoryOffer: '',
                        categoryOfferStatus: ''
                    }
                }
            )
            let products = await db.get().collection(collection.PRODUCT_COLLECTION).find({ category: category }).toArray();
            products.map(deleteCategoryOffer);

            async function deleteCategoryOffer(product) {
                await db.get().collection(collection.PRODUCT_COLLECTION).updateOne({ _id: product._id }, {
                    $unset: {
                        categoryOffer: '',
                        categoryOfferPrice: '',
                        categoryOfferStatus: ''
                    }
                }).then((response) => {
                    resolve(response)
                })
            }
        })
    }


}