const host = 'https://yapinkeji.com/shanduoparty';
const imagePath = host + '/picture/';

/*公众号登陆*/
function gzhLonin(code, cbOK) {
    $.ajax({
        url: "/yapingzh/gzhLonin.do",
        data: {
            "code": code
        },
        type: "POST",
        dataType: "json",
        success: function (result) {
            if (result.success) {
                localStorage.openid = result.openid;
                if (result.onbind) {
                    localStorage.localUser = JSON.stringify(result.userInfo);
                    cbOK && cbOK();
                } else {
                    localStorage.unionid = result.unionid;
                }
            }
        }
    });
}

/*加载活动内容*/
function loadActivityDetail(activityId, cbOk) {
    $.getJSON(host + '/activity/oneActivity', {activityId: activityId}, function (res) {
        if (res.success) {
            cbOk && cbOk(res.result);
        }
    })
}

/*加载动态详情*/
function loadDynamicDetails(dynamicId, cbOk) {
    $.getJSON(host + '/jdynamic/bydynamic', {dynamicId: dynamicId}, function (res) {
        if (res.success) {
            cbOk && cbOk(res.result);
        }
    })
}

/*加载动态评论列表*/
function loadCommentList(dynamicId, pageIndex, pageSize, cbOk, cbErr) {
    $.ajax({
        type: 'GET',
        url: host + '/jdynamic/commentList',
        data: {
            dynamicId: dynamicId,
            page: pageIndex,
            pageSize: pageSize
        },
        dataType: 'json',
        success: (res) => {
            cbOk && cbOk(res);
        },
        error: () => {
            cbErr && cbErr();
        }
    });
}

function login(unionId, username, password, cbOk, cbErr) {
    $.ajax({
        url: host + '/wx/bindingUser',
        data: {
            unionId: unionId, phone: username, password: password, type: 3
        },
        type: 'POST',
        header: {
            'content-type': 'application/x-www-form-urlencoded'
        },
        dataType: 'json',
        success: (res) => {
            if (res.success) {
                cbOk && cbOk(res.result);
            } else {
                cbErr && cbErr();
            }
        }
    });
}

//远程获取活动数据
function getActivityData(req, cbOk, cbErr, done) {
    $.ajax({
        url: host + '/activity/showHotActivity',
        data: req,
        dataType: 'json',
        success: (res) => {
            if (res.success) {
                cbOk && cbOk(res.result);
            } else {
                cbErr && cbErr();
            }
        }, error: function () {
            cbErr && cbErr();
        }, complete: function () {
            done && done();
        }, type: 'GET'
    });
}

//远程获取动态数据
function getDynamicData(req, cbOk, cbErr, done) {
    $.ajax({
        url: host + '/jdynamic/dynamicList',
        data: req,
        dataType: 'json',
        success: function (res) {
            console.log(res);
            if (res.success) {
                cbOk && cbOk(res.result);
            } else {
                cbErr && cbErr();
            }
        }, error: function () {
            cbErr && cbErr();
        }, complete: function () {
            done && done();
        }, type: 'GET'
    });
}

function gotoReleaseView(view) {
    if (localStorage.localUser) {
        location.href = view;
    } else {
        location.href = 'login.html';
    }
}

function loadProvinces(cb) {
    $.getJSON('/yapingzh/getProvinces.do', function (res) {
        cb && cb(res);
    });
}

function loadCities(provinceID, cb) {
    $.getJSON('/yapingzh/getCities.do', {"provinceID": provinceID}, function (res) {
        cb && cb(res);
    });
}

function loadAreas(cityID, cb) {
    $.getJSON('/yapingzh/getAreas.do', {"cityID": cityID}, function (res) {
        cb && cb(res);
    });
}