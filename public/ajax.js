
function changeQuantity(cartId, prodId, userId, count) {
    let quantity = document.getElementById(prodId).value
    $.ajax({
        url: '/changeProductQuantity',
        data: {
            cart: cartId,
            product: prodId,
            quantity: quantity,
            user: userId,
            count: count
        },
        method: 'post',
        success: (response) => {
            if (response.removeProduct) {
                // swal('One item removed from the cart')
                swal({
                    text: "One item removed from Cart!!",
                    icon: "warning",
                    button: "OK!",
                })
                    .then((response) => {
                        if (response) {
                            location.reload();
                        }
                    });
            } else {
                document.getElementById('totalAmount').innerHTML = response.totalAmount.total
                // document.getElementById(prodId).innerHTML=quantity+count

            }
        }
    })
}

$(document).ready(function (event) {
    $('#placeOrderForm').on('submit', function (e) {
        e.preventDefault();
        $.ajax({
            type: 'POST',
            url: '/checkout',
            data: $('#placeOrderForm').serialize(),
            success: function (data) {
                if(data.insufficientBalance){
                    document.getElementById('walletStatus').innerHTML = "Insufficient Balance";
                }else if (data.cod) {
                    window.location.href = "/order-summary";
                } else if (data.razorpay) {
                    placeOrder(data)
                } else if (data.paypal) {
                    for (let i = 0; i < data.links.length; i++) {
                        if (data.links[i].rel == "approval_url") {
                            location.href = data.links[i].href;
                        }
                    }
                }else if(data.wallet){
                    window.location.href = "/order-summary";
                } else {
                    swal('Error in payment')
                }
                if(data.cartCount){
                    document.getElementById('cartCountDisplay').innerHTML = data.cartCount;
                }

            }
        });
    });
});

function placeOrder(order) {
    var options = {
        "key": "rzp_test_aDqxl6uAqeR3M1", // Enter the Key ID generated from the Dashboard
        "amount": order.amount, // Amount is in currency subunits. Default currency is INR. Hence, 50000 refers to 50000 paise
        "currency": "INR",
        "name": "Acme Corp",
        "description": "Test Transaction",
        "image": "https://example.com/your_logo",
        "order_id": order.id, //This is a sample Order ID. Pass the `id` obtained in the response of Step 1
        "handler": function (response) {

            verifyPayment(order, response)
        },
        "prefill": {
            "name": "Gaurav Kumar",
            "email": "gaurav.kumar@example.com",
            "contact": "9999999999"
        },
        "notes": {
            "address": "Razorpay Corporate Office"
        },
        "theme": {
            "color": "#3399cc"
        }
    };
    var rzp1 = new Razorpay(options);
    rzp1.on('payment.failed', function (response) {
        alert(response.error.code);
        alert(response.error.description);
        alert(response.error.source);
        alert(response.error.step);
        alert(response.error.reason);
        alert(response.error.metadata.order_id);
        alert(response.error.metadata.payment_id);
    });
    rzp1.open();
}

function verifyPayment(order, response) {
    $.ajax({
        type: 'POST',
        url: '/verifyPayment',
        data: {
            order,
            response
        },
        success: function (data) {
            if (data.status) {
                window.location.href = "/order-summary";
            } else {
                swal('Payment failed')
            }

        }
    });
}

$(document).ready(function (event) {
    $('#applyCoupon').on('submit', function (e) {
        e.preventDefault();
        $.ajax({
            type: 'POST',
            url: '/applyCoupon',
            data: $('#applyCoupon').serialize(),
            success: function (response) {
                if (response.newAmount) {
                    document.getElementById('newAmountDisplay').innerHTML = 'Rs. ' + response.newAmount;
                    document.getElementById('newAmount').value = response.newAmount;
                    document.getElementById('appliedCouponInfoDisplay').innerHTML = 'Coupon Applied ' + response.couponCode;
                    $('#couponStatus').text('');
                    document.getElementById('appliedCouponInfo').value = response.couponCode;
                } else if (response.couponUsed) {
                    $('#couponStatus').text('You already used this coupon');
                } else if (response.noMinBuy) {
                    $('#couponStatus').text('You have to buy a minimum of ' + response.minBuy + ' to apply this coupon');
                } else if (response.inactive) {
                    $('#couponStatus').text('Sorry! This coupon is not available');
                } else {
                    $('#couponStatus').text('Please enter a valid coupon');
                }
            }
        });
    });
});

function addToWishlist(prodId) {
    $.ajax({
        url: '/addToWishlist',
        data: {
            prodId
        },
        method: 'post',
        success: (response) => {
            swal({
                title: "Added to wishlist!",
                icon: "success",
                button: "OK!",
            });
        }
    })
}


function addToCart(prodId) {
    $.ajax({
        url: '/addToCart',
        data: {
            prodId
        },
        method: 'post',
        success: (response) => {
            swal({
                title: "Added to Cart!",
                icon: "success",
                button: "OK!",
            });
            document.getElementById('cartCountDisplay').innerHTML = response.cartCount;
        }
    })
}

function removeFromWishlist(prodId) {
    swal({
        title: "Are you sure to remove?",
        icon: "warning",
        buttons: true,
        dangerMode: true,
    })
        .then((willRemove) => {
            if (willRemove) {
                $.ajax({
                    url: '/removeFromWishlist',
                    data: {
                        prodId
                    },
                    method: 'post',
                    success: (response) => {
                        location.reload();
                    }
                })
            }
        });
}

function removeFromCart(prodId) {
    swal({
        title: "Are you sure to remove?",
        icon: "warning",
        buttons: true,
        dangerMode: true,
    })
        .then((willRemove) => {
            if (willRemove) {
                $.ajax({
                    url: '/removeFromCart',
                    data: {
                        prodId
                    },
                    method: 'post',
                    success: (response) => {
                        location.reload();
                    }
                })
            }
        });
}


$(document).ready(function (event) {
    $('#addAddressForm').on('submit', function (e) {
        e.preventDefault();
        $.ajax({
            type: 'POST',
            url: '/address',
            data: $('#addAddressForm').serialize(),
            success: function (response) {
                swal({
                    title: "Done!",
                    text: "Added new Address!",
                    icon: "success",
                    button: "OK!",
                })
                    .then((response) => {
                        if (response) {
                            location.reload();
                        }
                    });
            }
        });
    });
});

function cancelOrder(orderId,orderAmount,paymentMethod) {
        swal({
            title: "Are you sure to Cancel?",
            icon: "warning",
            buttons: true,
            dangerMode: true,
        })
            .then((willRemove) => {
                if (willRemove) {
                    alert(orderId)
        alert(orderAmount)
        alert(paymentMethod)
                    $.ajax({
                        url: '/cancelOrder',
                        data: {
                            orderId:orderId,
                            orderAmount:orderAmount,
                            paymentMethod:paymentMethod,
                        },
                        method: 'post',
                        success: (response) => {
                            location.reload();
                        }
                    })
                }
            });
    }




