var express = require('express');
var router = express.Router();
const multer = require('multer');
var adminHelpers = require('../helpers/admin-helpers');
var productHelpers = require('../helpers/product-helpers');
var couponHelpers = require('../helpers/coupon-helpers')
const userHelpers = require('../helpers/user-helpers');
const categoryHelpers = require('../helpers/category-helpers');
const bannerHelpers = require('../helpers/banner-helpers');
const { response } = require('express');

// destination for product images
const fileStorageEngine = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './public/public-admin/product-images')
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "--" + file.originalname);
  }
})
const upload = multer({ storage: fileStorageEngine });
// destination for product images

// destination for banner images
const fileStorageEngineBanner = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './public/public-admin/banner-images')
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "--" + file.originalname);
  }
})
const uploadBanner = multer({ storage: fileStorageEngineBanner });
// destination for banner images


// newAdmin();
function newAdmin() {
  adminData = {
    userName: 'admin@gmail.com',
    password: '123'
  }
  adminHelpers.addAdmin(adminData).then((data) => {
    console.log('Admin data added');
  })
}

const verifyAdminLogin = (req, res, next) => {
  if (req.session.admin) next();
  else {
    req.session.noAdmin = 'You have to login first';
    res.redirect('/admin');
  }
}

/* GET users listing. */
router.get('/', async function (req, res, next) {
  if (req.session.admin) {
    let quartrData = await adminHelpers.getQuarterlyRevenue(2021)
    let cod = await adminHelpers.getPaymentMethodNums('cod')
    let razorpay = await adminHelpers.getPaymentMethodNums('razorpay')
    let paypal = await adminHelpers.getPaymentMethodNums('paypal')
    // let year = await adminHelpers.getRevenue('year', 1);
    // let sixMonth = await adminHelpers.getRevenue('month', 6)
    // let threeMonth = await adminHelpers.getRevenue('month', 3)
    // let month = await adminHelpers.getRevenue('month', 1);
    // let week = await adminHelpers.getRevenue('day', 7);
    res.render('admin/index', {quartrData, cod, razorpay, paypal, admin: true });
  } else {
    res.render('admin/login', { admin: true, login: true, adminLoginError: req.session.adminLoginError, noAdmin: req.session.noAdmin })
    req.session.adminLoginError = false;
    req.session.noAdmin = false;
  }
});

router.post('/getQuarterRevenue',verifyAdminLogin,async(req,res)=>{
  console.log(req.body);
  let quartrData = await adminHelpers.getQuarterlyRevenue(req.body.year)
  res.json(quartrData)
})

router.post('/login', (req, res) => {
  adminHelpers.getAdmin(req.body).then((response) => {
    if (response.status) {
      req.session.admin = true;
      res.redirect('/admin');
    } else {
      req.session.adminLoginError = 'Please enter valid details';
      res.redirect('/admin');
    }
  })
})

router.get('/view-users', verifyAdminLogin, (req, res) => {
  userHelpers.getAllUsers().then((users) => {
    res.render('admin/view-users', { users, admin: true, dataTableAdmin: true })
  })
})

router.get('/block/:id', (req, res) => {
  req.session.user = false;
  userHelpers.blockUser(req.params.id).then(() => {
    res.redirect('/admin/view-users');
  })
})

router.get('/unblock/:id', (req, res) => {
  userHelpers.unblockUser(req.params.id).then(() => {
    res.redirect('/admin/view-users');
  })
})

router.get('/view-products', verifyAdminLogin, (req, res) => {
  productHelpers.getAllProducts().then((products) => {
    res.render('admin/view-products', { admin: true, products, dataTableAdmin: true });
  })
})

router.get('/category', verifyAdminLogin, (req, res) => {
  categoryHelpers.getAllCategories().then((categories) => {
    res.render('admin/category', { admin: true, categories });
  })
})

router.get('/add-category', verifyAdminLogin, (req, res) => {
  res.render('admin/add-category', { admin: true })
})

router.post('/add-category', verifyAdminLogin, (req, res) => {
  categoryHelpers.addCategory(req.body).then(() => {
    res.redirect('/admin/category');
  })
})

router.get('/edit-category/:id', verifyAdminLogin, (req, res) => {
  categoryHelpers.getOneCategory(req.params.id).then((data) => {
    res.render('admin/edit-category', { data, admin: true })
  })

  router.post('/edit-category', verifyAdminLogin, (req, res) => {
    categoryHelpers.updateCategory(req.body).then((data) => {
      res.json({ data: true });
    })
  })

  router.post('/add-subcategory', (req, res) => {
    categoryHelpers.addSubcategory(req.body).then((response) => {
      res.json({ data: true })
    })
  })
})

router.post('/edit-subcategory', (req, res) => {
  categoryHelpers.editSubcategory(req.body).then(() => {
    res.json({ data: true })
  })
})

router.get('/delete-category/:id', verifyAdminLogin, (req, res) => {
  categoryHelpers.deleteCategory(req.params.id).then((response) => {
    res.redirect('/admin/category')
  })
})

router.post('/delete-subcategory', (req, res) => {
  categoryHelpers.deleteSubcategory(req.body).then(() => {
    res.json({ data: true })
  })
})

router.post('/categorySelected', (req, res) => {
  categoryHelpers.getSubCategory(req.body.category).then((subCategory) => {
    res.json(subCategory);
  })
})

router.get('/add-products', verifyAdminLogin, async (req, res) => {
  categoryHelpers.getAllCategories().then(async (categories) => {
    let brand = await categoryHelpers.getBrand();
    categoryHelpers.getSubCategory().then((subCategory) => {
      res.render('admin/add-products', { admin: true, categories, subCategory, brand });
    })
  })

})

router.post('/add-products', upload.array('images'), (req, res) => {
  productHelpers.addProducts(req.body).then(((id) => {
    res.redirect('/admin/view-products')
  }))
  var filenames = req.files.map(function (file) {
    return file.filename;
  });
  req.body.images = filenames;
})

router.get('/edit-product/:id', (req, res) => {
  productHelpers.getProduct(req.params.id).then((product) => {
    categoryHelpers.getAllCategories().then((categories) => {
      categoryHelpers.getSubCategory().then((subCategory) => {
        res.render('admin/edit-product', { product, categories, subCategory, admin: true });
      })

    })
  })
})

router.post('/edit-product/:id', upload.array('images'), (req, res) => {
  var filenames = req.files.map(function (file) {
    return file.filename;
  });
  req.body.images = filenames;
  productHelpers.editProduct(req.body, req.params.id).then((response) => {
    res.redirect('/admin/view-products')
  })

})

router.get('/delete-product/:id', (req, res) => {
  productHelpers.deleteProduct(req.params.id).then((response) => {
    res.redirect('/admin/view-products');
  })
})

router.get('/view-coupon', (req, res) => {
  couponHelpers.getAllCoupons().then((coupons) => {
    res.render('admin/view-coupon', { admin: true, coupons })
  })
})

router.get('/add-coupon', (req, res) => {
  res.render('admin/add-coupon', { admin: true })
})

router.post('/add-coupon', (req, res) => {
  couponHelpers.addCoupon(req.body).then((response) => {
    res.redirect('/admin/view-coupon')
  })
})

router.post('/add-categoryOffer', verifyAdminLogin, (req, res) => {
  categoryHelpers.addCategoryOffer(req.body).then((response) => {
    res.json(response)
  })
})

router.post('/delete-categoryOffer', verifyAdminLogin, (req, res) => {
  categoryHelpers.deleteCategoryOffer(req.body.category).then((response) => {
    res.json(response)
  })
})

router.get('/reports', verifyAdminLogin, async (req, res) => {
  let monthlyRevenue2022 = await adminHelpers.totalRevenueByMonth(2022)
  let monthlyRevenue2021 = await adminHelpers.totalRevenueByMonth(2021)
  res.render('admin/reports', { monthlyRevenue2022, monthlyRevenue2021, admin: true, dataTableAdmin: true })
})

router.get('/banner', verifyAdminLogin, async(req, res) => {
  let banner = await bannerHelpers.getBanner();
  res.render('admin/banner', { admin: true, banner})
})

router.get('/add-banner', verifyAdminLogin, (req, res) => {
  res.render('admin/add-banner', { admin: true })
})

router.post('/add-banner', uploadBanner.single('bannerImage'), verifyAdminLogin, (req, res) => {
  if(req.file){
    req.body.image = req.file.filename;
  }
  bannerHelpers.addBanner(req.body).then((response) => {
    res.redirect('/admin/banner')
  })
})  

router.get('/edit-banner/:id',verifyAdminLogin,(req,res)=>{
  bannerHelpers.getSingleBanner(req.params.id).then((bannerData)=>{
    res.render('admin/edit-banner',{admin:true,bannerData})
  })
})

router.post('/edit-banner',uploadBanner.single('bannerImage'),verifyAdminLogin,(req,res)=>{
  if(req.file){
    req.body.image = req.file.filename;
  }
  bannerHelpers.editBanner(req.body).then((response)=>{
    res.redirect('/admin/banner')
  })
})

router.post('/deleteBanner',verifyAdminLogin,(req,res)=>{
  bannerHelpers.deleteBanner(req.body.bannerId).then((response)=>{
    res.json(response);
  })
})

router.get('/recentOrders',verifyAdminLogin,async(req,res)=>{
  let recentOrders = await adminHelpers.getRecentOrders()
  res.render('admin/recent-orders',{admin:true, recentOrders,dataTableAdmin:true})
})

router.post('/changeOrderStatus',verifyAdminLogin,async(req,res)=>{
  await adminHelpers.changeOrderStatus(req.body).then((response)=>{
    res.json(response)
  })
})

router.get('/recentOrderDetails/:id',verifyAdminLogin,async(req,res)=>{
  let orderHistoryDetails = await productHelpers.getOrdereHistoryDetails(req.params.id)
  res.render('admin/recentOrderDetails',{orderHistoryDetails,admin:true})
})

router.get('/logout', (req, res) => {
  req.session.admin = false;
  res.redirect('/admin');
})

router.get('/test', (req, res) => {

})



module.exports = router;
