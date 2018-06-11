//获取指定参数的值
var openid = localStorage.getItem('openid');

function GetQueryString(name) {
    var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)", "i");
    var r = window.location.search.substr(1).match(reg);
    if (r != null)
        return (r[2]);
    return null;
}

function toast(msg) {
    layer.open({
        content: msg
        , skin: 'msg'
        , time: 2 //2秒后自动关闭
    });
}

function gzhLonin(code) {
    $.ajax({
        url: "/yapingzh/gzhLonin.do",
        data: {
            "code": code
        },
        type: "POST",
        dataType: "json",
        success: function (result) {
            if (result.success) {
                if (result.onbind) {
                    localStorage.localUser = JSON.stringify(result.userInfo);
                } else {
                    localStorage.setItem('openid', result.openid);
                    localStorage.setItem('unionid', result.unionid);
                }
            }
        }
    });
}

function init_wx_js_sdk(pageUrl, cbOK) {
    $.getJSON("/yapingzh/initJS_SDK.do", {
        "pageUrl": pageUrl
    }, function (result) {
        if (result.success) {
            cbOK && cbOK(result);
        }
    }, function (res) {
        toast(res.errMsg);
    });
}

// base64编码开始
function encode64(input) {
    let keyStr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let output = '';
    let chr1, chr2, chr3 = '';
    let enc1, enc2, enc3, enc4 = '';
    let i = 0;
    do {
        chr1 = input.charCodeAt(i++);
        chr2 = input.charCodeAt(i++);
        chr3 = input.charCodeAt(i++);
        enc1 = chr1 >> 2;
        enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
        enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
        enc4 = chr3 & 63;
        if (isNaN(chr2)) {
            enc3 = enc4 = 64;
        } else if (isNaN(chr3)) {
            enc4 = 64;
        }
        output = output + keyStr.charAt(enc1) + keyStr.charAt(enc2)
            + keyStr.charAt(enc3) + keyStr.charAt(enc4);
        chr1 = chr2 = chr3 = '';
        enc1 = enc2 = enc3 = enc4 = '';
    } while (i < input.length);

    return output;
}// base64编码结束

//非空校验
function checkInput(input) {
    if (!input) {
        return false;
    }
    input = input.replace(/\s/g, '');
    return input.length !== 0;
}

/*验证手机号*/
function checkPhone(str) {
    let myreg = /^(((13[0-9])|(15[0-9])|16[678]|17[0135678]|(18[0-9]))+\d{8})$/;
    return checkInput(str) && myreg.test(str);
}

function formatMsgTime(timespan) {
    let dateTime = new Date(timespan);
    let year = dateTime.getFullYear();
    let month = dateTime.getMonth() + 1;
    let day = dateTime.getDate();
    let hour = dateTime.getHours();
    let minute = dateTime.getMinutes();
    let second = dateTime.getSeconds();
    let now = new Date();
    let now_new = Date.parse(now.toDateString());  //typescript转换写法

    let milliseconds = 0;
    let timeSpanStr;

    milliseconds = now_new - timespan;

    if (milliseconds <= 1000 * 60 * 1) {
        timeSpanStr = '刚刚';
    }
    else if (1000 * 60 * 1 < milliseconds && milliseconds <= 1000 * 60 * 60) {
        timeSpanStr = Math.round((milliseconds / (1000 * 60))) + '分钟前';
    }
    else if (1000 * 60 * 60 * 1 < milliseconds && milliseconds <= 1000 * 60 * 60 * 24) {
        timeSpanStr = Math.round(milliseconds / (1000 * 60 * 60)) + '小时前';
    }
    else if (1000 * 60 * 60 * 24 < milliseconds && milliseconds <= 1000 * 60 * 60 * 24 * 15) {
        timeSpanStr = Math.round(milliseconds / (1000 * 60 * 60 * 24)) + '天前';
    }
    else if (milliseconds > 1000 * 60 * 60 * 24 * 15 && year == now.getFullYear()) {
        timeSpanStr = month + '-' + day + ' ' + hour + ':' + minute;
    } else {
        timeSpanStr = year + '-' + month + '-' + day + ' ' + hour + ':' + minute;
    }
    return timeSpanStr;
}