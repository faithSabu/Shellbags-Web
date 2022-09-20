const { response } = require('express');
var express = require('express');
const categoryHelpers = require('../helpers/category-helpers');
const productHelpers = require('../helpers/product-helpers');
// const { response } = require('../app');
var router = express.Router();
var userHelpers = require('../helpers/user-helpers');
var couponHelpers = require('../helpers/coupon-helpers')
const bannerHelpers = require('../helpers/banner-helpers');
var userValidation = require('../helpers/user-validation');
const paypal = require('paypal-rest-sdk');
var easyinvoice = require('easyinvoice');
// const imageZoom = require('')
require('dotenv').config();

// const { check, body, validationResult } = require('express-validator');

const client = require('twilio')(process.env.ACCOUNT_SID, process.env.AUTH_TOKEN);

router.use((req, res, next) => {
  req.session.user = {
    _id: '62e8c3d0074b97047dca41fc',
    fullName: 'shambu',
    email: 'sha@gmail.com',
    mobile: '9746369882',
    password: '$2b$10$AICWOd9dX4TLnLsATYxCteLm5Rv2oAeG4UdrJxIhWo1g3gUh27mcC',
    block: false
  }
  next();
})

const verifyUserLogin = async (req, res, next) => {
  if (req.session.user) {
    let cartCount = await userHelpers.getCartCount(req.session.user._id)
    let category = await categoryHelpers.getAllCategories()
    req.session.cartCount = cartCount;
    req.session.category = category;
    next();
  }
  else res.redirect('/login');
}

const getCategory = async (req, res, next) => {
  let category = await categoryHelpers.getAllCategories()
  req.session.category = category;
  next();
}

/* GET home page. */
router.get('/', getCategory, function (req, res, next) {
  req.session.cartCount = 0;
  if (req.session.user) {
    userHelpers.getCartCount(req.session.user._id).then((count) => {
      req.session.cartCount = count;
    })
  }
  productHelpers.getAllProducts().then(async (products) => {
    let banner = await bannerHelpers.getBanner();
    res.render('user/index', { products,banner, user: req.session.user, cartCount: req.session.cartCount, category: req.session.category });
  })
});


router.post('/register', (req, res) => {
  req.body.block = false;
  userHelpers.doSignup(req.body).then((response) => {
    res.redirect('/login')
  })
})

router.get('/login', function (req, res, next) {
  if (req.session.user) {
    res.redirect('/')
  } else {
    res.render('user/login', { 'loginErr': req.session.userLoginErr, 'loginBlocked': req.session.userBlocked, login: true });
    req.session.userLoginErr = false;
    req.session.userBlocked = false;
  }
});

router.post('/login', (req, res) => {
  userHelpers.doLogin(req.body).then((response) => {
    if (response.block) {
      req.session.userBlocked = "Sorry, Your Access has been denied."
      res.redirect('/login');
    } else {
      if (response.status) {
        req.session.user = response.user;
        res.redirect('/');
      } else {
        req.session.userLoginErr = 'Invalid username or password';
        res.redirect('/login');
      }
    }

  })
})

router.get('/otplogin', (req, res) => {
  res.render('user/otplogin', { invalidMobile: req.session.invalidMobile })
  req.session.invalidMobile = false;
})

router.post('/getOtp', (req, res) => {
  const mobileNumber = req.body.mobile;
  userHelpers.verifyMobile(mobileNumber).then((response) => {
    if (response.block) {
      req.session.userBlocked = "Sorry, Your Access has been denied."
      res.redirect('/login');
    }
    else if (response.status) {
      client.verify.v2.services(process.env.SERVICE_ID)
        .verifications
        .create({ to: '+91' + mobileNumber, channel: 'sms' })
        .then((verification) => {
          res.render('user/otp', { mobileNumber })
        })
        .catch((err) => console.log(err));
    } else if (response.noUser) {
      req.session.invalidMobile = "Please enter a mobile number registered with SHELLBAGS"
      res.redirect('/otplogin')
    }

  })

})
router.post('/verifyOtp', (req, res) => {
  const mobileNumber = req.body.mobile;
  const otp = req.body.otp;
  client.verify.v2.services(process.env.SERVICE_ID)
    .verificationChecks
    .create({ to: '+91' + mobileNumber, code: otp })
    .then(verification_check => {
      let approved = 'approved';
      if (verification_check.status == approved) {
        req.session.user = true;
        userHelpers.verifyMobile(mobileNumber, req.session.user).then((response) => {
          req.session.user = response.user;
          res.redirect('/')
        })
      } else {
        req.session.userOTPErr = 'OTP is invalid';
        res.render('user/otp', { 'userOTPErr': req.session.userOTPErr })
        req.session.userOTPErr = false;
      }
    })
    .catch((err) => {
      console.log('Catch error in otp-' + err);
    })
})

router.get('/singleProduct/:id',verifyUserLogin,getCategory, function (req, res, next) {
  productHelpers.getProduct(req.params.id).then((product) => {
    res.render('user/singleProduct', { product, user: req.session.user, cartCount: req.session.cartCount ,category: req.session.category});
  })
});

router.post('/addToCart', verifyUserLogin, (req, res) => {
  userHelpers.addToCart(req.session.user._id, req.body.prodId).then(() => {
    userHelpers.getCartCount(req.session.user._id).then((cartCount) => {
      response.cartCount = cartCount;
      res.json(response)
    })

  })
})

router.get('/viewCart', verifyUserLogin, (req, res) => {
  userHelpers.getCartItems(req.session.user._id).then((cartItems) => {
    userHelpers.getTotalAmount(req.session.user._id).then((totalAmount) => {
      res.render('user/cart', { cartItems, user: req.session.user, cartCount: req.session.cartCount, totalAmount })
    })
  })
})

router.post('/addToWishlist', verifyUserLogin, (req, res) => {
  userHelpers.addToWishlist(req.session.user._id, req.body.prodId).then(() => {
    res.json({ res: true })
  })
})

router.get('/wishlist', verifyUserLogin, (req, res) => {
  userHelpers.getWishlist(req.session.user._id).then((wishlist) => {
    res.render('user/wishlist', { wishlist, user: req.session.user, cartCount: req.session.cartCount })
  })
})


router.post('/removeFromCart', verifyUserLogin, (req, res) => {
  productHelpers.removeFromCart(req.session.user._id, req.body.prodId).then((response) => {
    res.json(response)
  })
})

router.post('/removeFromWishlist', verifyUserLogin, (req, res) => {
  productHelpers.removeFromWishlist(req.session.user._id, req.body.prodId).then((response) => {
    res.json(response)
  })
})

router.post('/changeProductQuantity', verifyUserLogin, (req, res) => {
  userHelpers.changeProductQuantity(req.body).then(async (response) => {
    if (response.removeProduct) {
      req.session.cartCount--;
    }
    response.totalAmount = await userHelpers.getTotalAmount(req.body.user,)
    res.json(response)
  })
})

router.get('/address', verifyUserLogin, (req, res) => {
  userHelpers.getAddress(req.session.user._id).then((address) => {
    res.render('user/address', { user: req.session.user, cartCount: req.session.cartCount, address })
  })
})

router.post('/address', verifyUserLogin, async (req, res) => {
  let totalAmount = await userHelpers.getTotalAmount(req.session.user._id)
  userHelpers.addAddress(req.body, req.session.user._id).then((response) => {
    // res.render('user/checkout', { user: req.session.user, cartCount:req.session.cartCount, totalAmount })
    // res.redirect('/address')
    res.json({ data: true })
  })
})
router.get('/checkout', verifyUserLogin, async (req, res) => {
  let totalAmount = await userHelpers.getTotalAmount(req.session.user._id)
  // totalAmount = userHelpers.getTotalAmount(req.session.user._id)
  res.render('user/checkout', { user: req.session.user, cartCount: req.session.cartCount, totalAmount })
})

router.post('/toCheckout', verifyUserLogin, (req, res) => {
  req.session.address = req.body.address;
  res.redirect('/checkout');
})

router.post('/checkout', verifyUserLogin, async (req, res) => {
  let orderedProducts = await userHelpers.getCartItems_placeOrder(req.body.userId)
  let totalAmount = {};
  totalAmount.total = parseInt(req.body.total);
  let deliveryDetails = await userHelpers.getSingleAddress(req.body.userId, req.session.address)
  couponHelpers.addCouponToUser(req.body.userId, req.body.couponCode)
  couponHelpers.addUsedCouponCount(req.body.couponCode)
  let orderId = await userHelpers.placeOrder(req.body.userId, orderedProducts, totalAmount, req.body.payment, deliveryDetails)
  let cartCount = await userHelpers.getCartCount(req.session.user._id)

  req.session.orderId = orderId.toString();
  if (req.body.payment == 'cod') {
    response.cartCount = cartCount;
    response.cod = true;
    res.json(response)
  } else if (req.body.payment == 'razorpay') {
    userHelpers.generateRazorpay(orderId, totalAmount).then((response) => {
      response.cartCount = cartCount;
      response.razorpay = true;
      res.json(response)
    })
  } else if (req.body.payment == 'paypal') {
    userHelpers.priceConverter(totalAmount.total).then((price) => {
      let convertedPrice = parseInt(price)
      req.session.convertedPrice = convertedPrice;
      userHelpers.generatePaypal(convertedPrice).then((response) => {
        response.cartCount = cartCount;
        response.paypal = true;
        res.json(response);
      });
    })
  } else {
    res.json({ paymentError: true })
  }
})

router.get('/order-summary',verifyUserLogin,getCategory, async(req,res)=>{
  let orderDetails = await productHelpers.getOrdereHistoryDetails(req.session.orderId)
  // let orderDetails = await productHelpers.getOrdereHistoryDetails('6321a59511ae6dee2e56181d')
  console.log(orderDetails);
  console.log(orderDetails[0].product);
  res.render('user/order-summary',{orderDetails, user: req.session.user, cartCount: req.session.cartCount ,length:orderDetails.length});
})


router.get("/paypalSuccess", verifyUserLogin, (req, res) => {
  userHelpers.changePaymentStatus(req.session.orderId).then(async() => {
    let deleteResponse = await userHelpers.deleteCart(req.session.user._id)
    const payerId = req.query.PayerID;
    const paymentId = req.query.paymentId;
    const execute_payment_json = {
      payer_id: payerId,
      transactions: [{
        amount: {
          currency: "USD",
          total: req.session.convertedPrice,
        },
      },
      ],
    };

    paypal.payment.execute(paymentId, execute_payment_json, function (error, payment) {
      if (error) {
        console.log(error.response);
        throw error;
      } else {
        console.log(JSON.stringify(payment));
        res.redirect("/order-summary");
      }
    }
    );
  });
});

router.get("/paypalCancel", verifyUserLogin, (req, res) => {
  userHelpers.deleteOrder(req.session.orderId).then((data) => {
    //  res.redirect("/cart");
  })
});


router.post('/verifyPayment', verifyUserLogin, (req, res) => {
  userHelpers.verifyPayment(req.body).then((response) => {
    userHelpers.changePaymentStatus(req.body['order[receipt]']).then(async() => {
      let deleteCartResponse = await userHelpers.deleteCart(req.session.user._id)
      res.json({ status: true })
    })
  }).catch((err) => {
    res.json({ status: false })
  })
})

router.post('/applyCoupon', async (req, res) => {
  let coupon = await couponHelpers.getCoupon(req.body.couponCode);
  if (coupon) {
    let response = await couponHelpers.checkCoupon(req.session.user._id, coupon, req.body.totalAmount);
    res.json(response);
  } else {
    response.noCoupon = true;
    res.json(response);
  }
})

router.get('/myAccount', verifyUserLogin, (req, res) => {
  userHelpers.getAddress(req.session.user._id).then((address) => {
    res.render('user/myAccount', { address })
  })
})


router.get('/category/:id', verifyUserLogin, getCategory, async (req, res) => {
  let singleCategory = await categoryHelpers.getOneCategory(req.params.id)
  let products = await productHelpers.getCategoryProducts(singleCategory.category);
  let brand = await categoryHelpers.getBrand();
  res.render('user/categorywiseDisplay', { user: req.session.user, cartCount: req.session.cartCount,category:req.session.category,singleCategory,brand,products })
})

router.post('/filterProducts',verifyUserLogin,getCategory,async(req,res)=>{
  productHelpers.getFilteredProducts(req.body).then(async(products)=>{
    if(products.nothingSelected){
      products = false;
    }
      let singleCategory = await categoryHelpers.getOneCategory(req.body.categoryId)
      let brand = await categoryHelpers.getBrand();
      res.render('user/categorywiseDisplay', { user: req.session.user, cartCount: req.session.cartCount,category:req.session.category,singleCategory,brand,products })
  })
})

router.get('/order-history',verifyUserLogin,async(req,res)=>{
  let deletePendingResponse = await userHelpers.deletePendingOrder();
  let orderHistory = await productHelpers.getOrdereHistory(req.session.user._id)
  console.log(orderHistory);
  // console.log(orderHistory[0].orderedProducts);
  console.log(orderHistory.length);

  for(let i=0;i<orderHistory.length;i++){
    orderHistory[i].date = orderHistory[i].date.toISOString().substring(0, 10);
  }
  console.log(orderHistory);
  res.render('user/order-history',{user: req.session.user,cartCount: req.session.cartCount,orderHistory})
})

router.get('/order-historyDetails/:id',verifyUserLogin,getCategory, async(req,res)=>{
  let orderHistoryDetails = await productHelpers.getOrdereHistoryDetails(req.params.id)
  res.render('user/order-historyDetails',{user: req.session.user,cartCount: req.session.cartCount,orderHistoryDetails})
})

router.post('/cancelOrder',verifyUserLogin,(req,res)=>{
  productHelpers.cancelOrder(req.body.orderId).then((response)=>{
    res.json(response)
  })
})

router.get('/invoice',async(req,res)=>{
  let orderDetails = await productHelpers.getOrdereHistoryDetails(req.session.orderId)
  // let orderDetails = await productHelpers.getOrdereHistoryDetails('6321a59511ae6dee2e56181d')
  productHelpers.invoice(orderDetails).then((data)=>{
    res.json(data)
  })
  
})

router.get('/logout', (req, res) => {
  req.session.user = null;
  res.redirect('/');
})


router.get('/test', async (req, res) => {
  userHelpers.getCartItems_placeOrder(req.session.user._id)
  res.render('user/shop')
})

router.post('/test', (req, res) => {
  console.log('req.body');
  console.log('dfsdf');
  console.log(req.body);
  res.json({r:true})
})

module.exports = router;






// {
//   id: 'PAYID-ML62R6A31D12200681524643',
//   intent: 'sale',
//   state: 'created',
//   payer: { payment_method: 'paypal' },
//   transactions: [
//     {
//       amount: [Object],
//       description: 'Best bags ever',
//       item_list: [Object],
//       related_resources: []
//     }
//   ],
//   create_time: '2022-08-18T02:50:32Z',
//   links: [
//     {
//       href: 'https://api.sandbox.paypal.com/v1/payments/payment/PAYID-ML62R6A31D12200681524643',
//       rel: 'self',
//       method: 'GET'
//     },
//     {
//       href: 'https://www.sandbox.paypal.com/cgi-bin/webscr?cmd=_express-checkout&token=EC-8E394982134803639',
//       rel: 'approval_url',
//       method: 'REDIRECT'
//     },
//     {
//       href: 'https://api.sandbox.paypal.com/v1/payments/payment/PAYID-ML62R6A31D12200681524643/execute',
//       rel: 'execute',
//       method: 'POST'
//     }
//   ],
//   httpStatusCode: 201,
//   paypal: true
// }

