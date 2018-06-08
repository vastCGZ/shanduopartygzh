const host = 'https://yapinkeji.com/shanduoparty';
const imagePath = host + '/picture/';

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

function login(username, password, cbOk, cbErr) {
    $.ajax({
        url: host + '/juser/loginuser',
        data: {
            username: username, password: password
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