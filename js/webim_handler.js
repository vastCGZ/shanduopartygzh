var selToID
    , loginInfo = {}
    , accountMode
    , accountType
    , sdkAppID
    , avChatRoomId
    , selType
    , selSess
    , selSessHeadUrl;
const Config = {
    sdkappid: 1400088239,
    accountType: 25943,
    accountMode: 0 //帐号模式，0-表示独立模式，1-表示托管模式
};

function initIM(localUser, cbOk) {
    // var avChatRoomId = '@TGS#aWTBZTDFW';
    init({
        accountMode: Config.accountMode
        , accountType: Config.accountType
        , sdkAppID: Config.sdkappid
    });
    //当前用户身份
    loginInfo.sdkAppID = Config.sdkappid; //用户所属应用id,必填
    loginInfo.appIDAt3rd = Config.sdkappid; //用户所属应用id，必填
    loginInfo.accountType = Config.accountType; //用户所属应用帐号类型，必填
    loginInfo.identifier = localUser.userId; //当前用户ID,必须是字符串类型，选填
    loginInfo.identifierNick = localUser.name; //当前用户昵称，选填
    loginInfo.userSig = localUser.userSig; //当前用户身份凭证，必须是字符串类型，选填
    loginInfo.headimg = imagePath + localUser.picture;
    loginInfo.gender = localUser.gender;
    //监听事件
    let listeners = {
        "onConnNotify": onConnNotify, //选填,
        //监听新消息(大群)事件，必填
        "onMsgNotify": onMsgNotify,//监听新消息(私聊(包括普通消息和全员推送消息)，普通群(非直播聊天室)消息)事件，必填
    };

    //其他对象，选填
    let options = {
        'isAccessFormalEnv': true,//是否访问正式环境，默认访问正式，选填
        'isLogOn': false//是否开启控制台打印日志,默认开启，选填
    };
    //sdk登录
    sdkLogin(loginInfo, listeners, options, cbOk);
}

//获取用户资料
function searchProfileByUserId(ids, cbOK) {
    let tag_list = [
        "Tag_Profile_IM_Nick",//昵称
        "Tag_Profile_IM_Gender",//性别
        "Tag_Profile_IM_Image"//头像
    ];
    let options = {
        'To_Account': ids,
        'TagList': tag_list
    };
    webim.getProfilePortrait(
        options,
        function (resp) {
            if (resp.UserProfileItem && resp.UserProfileItem.length > 0) {
                let profile = [];
                for (let i in resp.UserProfileItem) {
                    let to_account = resp.UserProfileItem[i].To_Account;
                    let nick = null, gender = null, imageUrl = null;
                    for (let j in resp.UserProfileItem[i].ProfileItem) {
                        switch (resp.UserProfileItem[i].ProfileItem[j].Tag) {
                            case 'Tag_Profile_IM_Nick':
                                nick = resp.UserProfileItem[i].ProfileItem[j].Value;
                                break;
                            case 'Tag_Profile_IM_Gender':
                                switch (resp.UserProfileItem[i].ProfileItem[j].Value) {
                                    case 'Gender_Type_Male':
                                        gender = '男';
                                        break;
                                    case 'Gender_Type_Female':
                                        gender = '女';
                                        break;
                                    case 'Gender_Type_Unknown':
                                        gender = '未知';
                                        break;
                                }
                                break;
                            case 'Tag_Profile_IM_Image':
                                imageUrl = resp.UserProfileItem[i].ProfileItem[j].Value;
                                break;
                        }
                    }
                    profile.push({
                        To_Account: to_account,
                        Nick: webim.Tool.formatText2Html(nick),
                        Gender: gender,
                        Image: imageUrl
                    });
                }
                cbOK && cbOK(profile);
            }
        },
        function (err) {
            console.log(err);
        }
    );
}

//监听大群新消息（普通，点赞，提示，红包）
function onBigGroupMsgNotify(msgList, callback) {
    for (var i = msgList.length - 1; i >= 0; i--) {//遍历消息，按照时间从后往前
        var msg = msgList[i];
        //console.warn(msg);
        webim.Log.warn('receive a new avchatroom group msg: ' + msg.getFromAccountNick());
        //显示收到的消息
        callback(showMsg(msg));
        //showMsg(msg);
    }
}

//监听连接状态回调变化事件
function onConnNotify(resp) {
    var actionStatus = '';
    switch (resp.ErrorCode) {
        case webim.CONNECTION_STATUS.ON:
            actionStatus = '会话正常';
            break;
        case webim.CONNECTION_STATUS.OFF:
            actionStatus = '离线';
            break;
        default:
            actionStatus = '网络未知';
            break;
    }
    onConnNotifyback(actionStatus);
}

//监听新消息(私聊(包括普通消息、全员推送消息)，普通群(非直播聊天室)消息)事件
//newMsgList 为新消息数组，结构为[Msg]
function onMsgNotify(newMsgList) {
    var newMsg;
    for (var j in newMsgList) {//遍历新消息
        newMsg = newMsgList[j];
        handlderMsg(newMsg);//处理新消息
    }
}

//处理消息（私聊(包括普通消息和全员推送消息)，普通群(非直播聊天室)消息）
function handlderMsg(msg) {
    var fromAccount, fromAccountNick, sessType, subType, contentHtml;
    fromAccount = msg.getFromAccount();
    if (!fromAccount) {
        fromAccount = '';
    }
    fromAccountNick = msg.getFromAccountNick();
    if (!fromAccountNick) {
        fromAccountNick = fromAccount;
    }

    //解析消息
    //获取会话类型
    //webim.SESSION_TYPE.GROUP-群聊，
    //webim.SESSION_TYPE.C2C-私聊，
    sessType = msg.getSession().type();
    //获取消息子类型
    //会话类型为群聊时，子类型为：webim.GROUP_MSG_SUB_TYPE
    //会话类型为私聊时，子类型为：webim.C2C_MSG_SUB_TYPE
    subType = msg.getSubType();

    switch (sessType) {
        case webim.SESSION_TYPE.C2C://私聊消息
            switch (subType) {
                case webim.C2C_MSG_SUB_TYPE.COMMON://c2c普通消息
                    //业务可以根据发送者帐号fromAccount是否为app管理员帐号，来判断c2c消息是否为全员推送消息，还是普通好友消息
                    //或者业务在发送全员推送消息时，发送自定义类型(webim.MSG_ELEMENT_TYPE.CUSTOM,即TIMCustomElem)的消息，在里面增加一个字段来标识消息是否为推送消息
                    contentHtml = convertMsgtoHtml(msg);
                    // webim.Log.warn('receive a new c2c msg: fromAccountNick=' + fromAccountNick + ", content=" + contentHtml);
                    //c2c消息一定要调用已读上报接口
                    var opts = {
                        'To_Account': fromAccount,//好友帐号
                        'LastedMsgTime': msg.getTime()//消息时间戳
                    };
                    webim.c2CMsgReaded(opts);
                    // console.error('收到一条c2c消息(好友消息或者全员推送消息): 发送人=' + fromAccountNick + ", 内容=" + contentHtml);
                    let msgObj = {
                        fromAccount: fromAccount,
                        content: null,
                        Type: 1,
                        msgType: msg.elems[0].type,
                        time: getLocalTime(msg.getTime())
                    };
                    switch (msg.elems[0].type) {
                        case 'TIMTextElem':
                            //文本
                            msgObj.content = contentHtml;
                            break;
                        case 'TIMImageElem':
                            //图片
                            msgObj.content = msg.elems[0].content.ImageInfoArray;//[url]
                            break;
                        case 'TIMFaceElem':
                            //表情
                            break;
                        case 'TIMSoundElem':
                            //语音,只支持显示
                            break;
                        case 'TIMFileElem':
                            //文件,只支持显示
                            break;
                    }
                    newMessageNotification(msgObj);
                    break;
            }
            break;
        case webim.SESSION_TYPE.GROUP://普通群消息，对于直播聊天室场景，不需要作处理
            break;
    }
}

//sdk登录
function sdkLogin(userInfo, listeners, options, cbOk) {
    webim.login(
        userInfo, listeners, options,
        function (resp) {
            cbOk && cbOk(resp);
            webim.setProfilePortrait(
                {
                    'ProfileItem': [{
                        "Tag": "Tag_Profile_IM_Nick",
                        "Value": userInfo.identifierNick
                    }, {
                        "Tag": "Tag_Profile_IM_Image",
                        "Value": userInfo.headimg
                    }, {
                        "Tag": "Tag_Profile_IM_Gender",
                        "Value": userInfo.gender === "0" ? "Gender_Type_Female" : "Gender_Type_Male"
                    }]
                },
                function (resp) {
                },
                function (err) {
                }
            );
        },
        function (err) {
            console.log(err.ErrorInfo);
        }
    );
}

//修改昵称
function setProfilePortrait(options, callback) {
    webim.setProfilePortrait(options,
        function (res) {
            webim.Log.info('修改昵称成功');
            callback && callback(res);
        },
        function () {

        }
    );
}

//进入大群
function applyJoinBigGroup(groupId) {
    var options = {
        'GroupId': groupId//群id
    };
    webim.applyJoinBigGroup(
        options,
        function (resp) {
            //JoinedSuccess:加入成功; WaitAdminApproval:等待管理员审批
            if (resp.JoinedStatus && resp.JoinedStatus == 'JoinedSuccess') {
                webim.Log.info('进群成功');
                selToID = groupId;
            } else {
                console.error('进群失败');
            }
        },
        function (err) {
            console.error(err.ErrorInfo);
        }
    );
}

//显示消息（群普通+点赞+提示+红包）
function showMsg(msg) {
    var isSelfSend, fromAccount, fromAccountNick, sessType, subType;
    var ul, li, paneDiv, textDiv, nickNameSpan, contentSpan;
    fromAccount = msg.getFromAccount();
    if (!fromAccount) {
        fromAccount = '';
    }
    fromAccountNick = msg.getFromAccountNick();
    if (!fromAccountNick) {
        fromAccountNick = '未知用户';
    }
    //解析消息
    //获取会话类型，目前只支持群聊
    //webim.SESSION_TYPE.GROUP-群聊，
    //webim.SESSION_TYPE.C2C-私聊，
    sessType = msg.getSession().type();
    //获取消息子类型
    //会话类型为群聊时，子类型为：webim.GROUP_MSG_SUB_TYPE
    //会话类型为私聊时，子类型为：webim.C2C_MSG_SUB_TYPE
    subType = msg.getSubType();
    isSelfSend = msg.getIsSend();//消息是否为自己发的
    var content = "";
    switch (subType) {
        case webim.GROUP_MSG_SUB_TYPE.COMMON://群普通消息
            content = convertMsgtoHtml(msg);
            break;
        case webim.GROUP_MSG_SUB_TYPE.REDPACKET://群红包消息
            content = "[群红包消息]" + convertMsgtoHtml(msg);
            break;
        case webim.GROUP_MSG_SUB_TYPE.LOVEMSG://群点赞消息
            //业务自己可以增加逻辑，比如展示点赞动画效果
            content = "[群点赞消息]" + convertMsgtoHtml(msg);
            //展示点赞动画
            showLoveMsgAnimation();
            break;
        case webim.GROUP_MSG_SUB_TYPE.TIP://群提示消息
            content = "[群提示消息]" + convertMsgtoHtml(msg);
            break;
    }
    return {
        fromAccount: fromAccount,
        content: content,
        Type: 1,
        msgType: 'TIMTextElem',
        time: getLocalTime(msg.getTime()),
        me: isSelfSend
    }
}

//把消息转换成Html
function convertMsgtoHtml(msg) {
    var html = "", elems, elem, type, content;
    elems = msg.getElems();//获取消息包含的元素数组
    for (var i in elems) {
        elem = elems[i];
        type = elem.getType();//获取元素类型
        content = elem.getContent();//获取元素对象
        switch (type) {
            case webim.MSG_ELEMENT_TYPE.TEXT:
                html += convertTextMsgToHtml(content);
                break;
            case webim.MSG_ELEMENT_TYPE.FACE:
                html += convertFaceMsgToHtml(content);
                break;
            case webim.MSG_ELEMENT_TYPE.IMAGE:
                html += convertImageMsgToHtml(content);
                break;
            case webim.MSG_ELEMENT_TYPE.SOUND:
                html += convertSoundMsgToHtml(content);
                break;
            case webim.MSG_ELEMENT_TYPE.FILE:
                html += convertFileMsgToHtml(content);
                break;
            case webim.MSG_ELEMENT_TYPE.LOCATION://暂不支持地理位置
                //html += convertLocationMsgToHtml(content);
                break;
            case webim.MSG_ELEMENT_TYPE.CUSTOM:
                html += convertCustomMsgToHtml(content);
                break;
            case webim.MSG_ELEMENT_TYPE.GROUP_TIP:
                html += convertGroupTipMsgToHtml(content);
                break;
            default:
                webim.Log.error('未知消息元素类型: elemType=' + type);
                break;
        }
    }
    return webim.Tool.formatHtml2Text(html);
}

//解析文本消息元素
function convertTextMsgToHtml(content) {
    return content.getText();
}

//解析表情消息元素
function convertFaceMsgToHtml(content) {
    return content.getData();
    return content;
    var faceUrl = null;
    var data = content.getData();
    var index = webim.EmotionDataIndexs[data];

    var emotion = webim.Emotions[index];
    if (emotion && emotion[1]) {
        faceUrl = emotion[1];
    }
    if (faceUrl) {
        return "<img src='" + faceUrl + "'/>";
    } else {
        return data;
    }
}

//解析图片消息元素
function convertImageMsgToHtml(content) {
    var smallImage = content.getImage(webim.IMAGE_TYPE.SMALL);//小图
    var bigImage = content.getImage(webim.IMAGE_TYPE.LARGE);//大图
    var oriImage = content.getImage(webim.IMAGE_TYPE.ORIGIN);//原图
    if (!bigImage) {
        bigImage = smallImage;
    }
    if (!oriImage) {
        oriImage = smallImage;
    }
    return "<img src='" + smallImage.getUrl() + "#" + bigImage.getUrl() + "#" + oriImage.getUrl() + "' style='CURSOR: hand' id='" + content.getImageId() + "' bigImgUrl='" + bigImage.getUrl() + "' onclick='imageClick(this)' />";
}

//解析语音消息元素
function convertSoundMsgToHtml(content) {
    var second = content.getSecond();//获取语音时长
    var downUrl = content.getDownUrl();
    if (webim.BROWSER_INFO.type == 'ie' && parseInt(webim.BROWSER_INFO.ver) <= 8) {
        return '[这是一条语音消息]demo暂不支持ie8(含)以下浏览器播放语音,语音URL:' + downUrl;
    }
    return '<audio src="' + downUrl + '" controls="controls" onplay="onChangePlayAudio(this)" preload="none"></audio>';
}

//解析文件消息元素
function convertFileMsgToHtml(content) {
    var fileSize = Math.round(content.getSize() / 1024);
    return '<a href="' + content.getDownUrl() + '" title="点击下载文件" ><i class="glyphicon glyphicon-file">&nbsp;' + content.getName() + '(' + fileSize + 'KB)</i></a>';

}

//解析位置消息元素
function convertLocationMsgToHtml(content) {
    return '经度=' + content.getLongitude() + ',纬度=' + content.getLatitude() + ',描述=' + content.getDesc();
}

//解析自定义消息元素
function convertCustomMsgToHtml(content) {
    var data = content.getData();
    var desc = content.getDesc();
    var ext = content.getExt();
    return "data=" + data + ", desc=" + desc + ", ext=" + ext;
}

//解析群提示消息元素
function convertGroupTipMsgToHtml(content) {
    var WEB_IM_GROUP_TIP_MAX_USER_COUNT = 10;
    var text = "";
    var maxIndex = WEB_IM_GROUP_TIP_MAX_USER_COUNT - 1;
    var opType, opUserId, userIdList;
    var memberCount;
    opType = content.getOpType();//群提示消息类型（操作类型）
    opUserId = content.getOpUserId();//操作人id
    switch (opType) {
        case webim.GROUP_TIP_TYPE.JOIN://加入群
            userIdList = content.getUserIdList();
            //text += opUserId + "邀请了";
            for (var m in userIdList) {
                text += userIdList[m] + ",";
                if (userIdList.length > WEB_IM_GROUP_TIP_MAX_USER_COUNT && m == maxIndex) {
                    text += "等" + userIdList.length + "人";
                    break;
                }
            }
            text = text.substring(0, text.length - 1);
            text += "进入房间";
            //房间成员数加1
            // memberCount = $('#user-icon-fans').html();
            memberCount = parseInt(memberCount) + 1;
            break;
        case webim.GROUP_TIP_TYPE.QUIT://退出群
            text += opUserId + "离开房间";
            //房间成员数减1
            if (memberCount > 0) {
                memberCount = parseInt(memberCount) - 1;
            }
            break;
        case webim.GROUP_TIP_TYPE.KICK://踢出群
            text += opUserId + "将";
            userIdList = content.getUserIdList();
            for (var m in userIdList) {
                text += userIdList[m] + ",";
                if (userIdList.length > WEB_IM_GROUP_TIP_MAX_USER_COUNT && m == maxIndex) {
                    text += "等" + userIdList.length + "人";
                    break;
                }
            }
            text += "踢出该群";
            break;
        case webim.GROUP_TIP_TYPE.SET_ADMIN://设置管理员
            text += opUserId + "将";
            userIdList = content.getUserIdList();
            for (var m in userIdList) {
                text += userIdList[m] + ",";
                if (userIdList.length > WEB_IM_GROUP_TIP_MAX_USER_COUNT && m == maxIndex) {
                    text += "等" + userIdList.length + "人";
                    break;
                }
            }
            text += "设为管理员";
            break;
        case webim.GROUP_TIP_TYPE.CANCEL_ADMIN://取消管理员
            text += opUserId + "取消";
            userIdList = content.getUserIdList();
            for (var m in userIdList) {
                text += userIdList[m] + ",";
                if (userIdList.length > WEB_IM_GROUP_TIP_MAX_USER_COUNT && m == maxIndex) {
                    text += "等" + userIdList.length + "人";
                    break;
                }
            }
            text += "的管理员资格";
            break;

        case webim.GROUP_TIP_TYPE.MODIFY_GROUP_INFO://群资料变更
            text += opUserId + "修改了群资料：";
            var groupInfoList = content.getGroupInfoList();
            var type, value;
            for (var m in groupInfoList) {
                type = groupInfoList[m].getType();
                value = groupInfoList[m].getValue();
                switch (type) {
                    case webim.GROUP_TIP_MODIFY_GROUP_INFO_TYPE.FACE_URL:
                        text += "群头像为" + value + "; ";
                        break;
                    case webim.GROUP_TIP_MODIFY_GROUP_INFO_TYPE.NAME:
                        text += "群名称为" + value + "; ";
                        break;
                    case webim.GROUP_TIP_MODIFY_GROUP_INFO_TYPE.OWNER:
                        text += "群主为" + value + "; ";
                        break;
                    case webim.GROUP_TIP_MODIFY_GROUP_INFO_TYPE.NOTIFICATION:
                        text += "群公告为" + value + "; ";
                        break;
                    case webim.GROUP_TIP_MODIFY_GROUP_INFO_TYPE.INTRODUCTION:
                        text += "群简介为" + value + "; ";
                        break;
                    default:
                        text += "未知信息为:type=" + type + ",value=" + value + "; ";
                        break;
                }
            }
            break;

        case webim.GROUP_TIP_TYPE.MODIFY_MEMBER_INFO://群成员资料变更(禁言时间)
            text += opUserId + "修改了群成员资料:";
            var memberInfoList = content.getMemberInfoList();
            var userId, shutupTime;
            for (var m in memberInfoList) {
                userId = memberInfoList[m].getUserId();
                shutupTime = memberInfoList[m].getShutupTime();
                text += userId + ": ";
                if (shutupTime != null && shutupTime !== undefined) {
                    if (shutupTime == 0) {
                        text += "取消禁言; ";
                    } else {
                        text += "禁言" + shutupTime + "秒; ";
                    }
                } else {
                    text += " shutupTime为空";
                }
                if (memberInfoList.length > WEB_IM_GROUP_TIP_MAX_USER_COUNT && m == maxIndex) {
                    text += "等" + memberInfoList.length + "人";
                    break;
                }
            }
            break;
        default:
            text += "未知群提示消息类型：type=" + opType;
            break;
    }
    return text;
}

//tls登录
function tlsLogin() {
    //跳转到TLS登录页面
    console.warn('tlslogin need rewrite');
    // TLSHelper.goLogin({
    //     sdkappid: loginInfo.sdkAppID,
    //     acctype: loginInfo.accountType,
    //     url: window.location.href
    // });
}

//第三方应用需要实现这个函数，并在这里拿到UserSig
function tlsGetUserSig(res) {
    //成功拿到凭证
    if (res.ErrorCode == webim.TLS_ERROR_CODE.OK) {
        //从当前URL中获取参数为identifier的值
        loginInfo.identifier = webim.Tool.getQueryString("identifier");
        //拿到正式身份凭证
        loginInfo.userSig = res.UserSig;
        //从当前URL中获取参数为sdkappid的值
        loginInfo.sdkAppID = loginInfo.appIDAt3rd = Number(webim.Tool.getQueryString("sdkappid"));
        //从cookie获取accountType
        var accountType = webim.Tool.getCookie('accountType');
        if (accountType) {
            loginInfo.accountType = accountType;
            sdkLogin();//sdk登录
        } else {
            location.href = location.href.replace(/\?.*$/gi, "");
        }
    } else {
        //签名过期，需要重新登录
        if (res.ErrorCode == webim.TLS_ERROR_CODE.SIGNATURE_EXPIRATION) {
            tlsLogin();
        } else {
            console.error("[" + res.ErrorCode + "]" + res.ErrorInfo);
        }
    }
}

//单击图片事件
function imageClick(imgObj) {
    var imgUrls = imgObj.src;
    var imgUrlArr = imgUrls.split("#"); //字符分割
    var smallImgUrl = imgUrlArr[0];//小图
    var bigImgUrl = imgUrlArr[1];//大图
    var oriImgUrl = imgUrlArr[2];//原图
    webim.Log.info("小图url:" + smallImgUrl);
    webim.Log.info("大图url:" + bigImgUrl);
    webim.Log.info("原图url:" + oriImgUrl);
}


//切换播放audio对象
function onChangePlayAudio(obj) {
    if (curPlayAudio) {//如果正在播放语音
        if (curPlayAudio != obj) {//要播放的语音跟当前播放的语音不一样
            curPlayAudio.currentTime = 0;
            curPlayAudio.pause();
            curPlayAudio = obj;
        }
    } else {
        curPlayAudio = obj;//记录当前播放的语音
    }
}

//单击评论图片
function smsPicClick() {
    if (!loginInfo.identifier) {//未登录
        if (accountMode == 1) {//托管模式
            //将account_type保存到cookie中,有效期是1天
            webim.Tool.setCookie('accountType', loginInfo.accountType, 3600 * 24);
            //调用tls登录服务
            tlsLogin();
        } else {//独立模式
            console.error('请填写帐号和票据');
        }
        return;
    } else {
        hideDiscussTool();//隐藏评论工具栏
        showDiscussForm();//显示评论表单
    }
}

//发送消息(普通消息)
function onSendMsg(msg, cbOk, cbErr) {
    if (!loginInfo.identifier) {//未登录
        if (accountMode == 1) {//托管模式
            //将account_type保存到cookie中,有效期是1天
            webim.Tool.setCookie('accountType', loginInfo.accountType, 3600 * 24);
            //调用tls登录服务
            tlsLogin();
        } else {//独立模式
            console.error('请填写帐号和票据');
        }
        return;
    }

    if (!selToID) {
        console.error("您还没有进入房间，暂不能聊天");
        return;
    }
    //获取消息内容
    var msgtosend = msg;
    var msgLen = webim.Tool.getStrBytes(msg);

    if (msgtosend.length < 1) {
        console.error("发送的消息不能为空!");
        return;
    }

    var maxLen, errInfo;
    if (selType == webim.SESSION_TYPE.GROUP) {
        maxLen = webim.MSG_MAX_LENGTH.GROUP;
        errInfo = "消息长度超出限制(最多" + Math.round(maxLen / 3) + "汉字)";
    } else {
        maxLen = webim.MSG_MAX_LENGTH.C2C;
        errInfo = "消息长度超出限制(最多" + Math.round(maxLen / 3) + "汉字)";
    }
    if (msgLen > maxLen) {
        cbErr(errInfo);
        return;
    }
    if (!selSess || selSess._impl.id != selToID) {
        selSess = new webim.Session(selType, selToID, selToID, selSessHeadUrl, Math.round(new Date().getTime() / 1000));
    }
    var isSend = true;//是否为自己发送
    var seq = -1;//消息序列，-1表示sdk自动生成，用于去重
    var random = Math.round(Math.random() * 4294967296);//消息随机数，用于去重
    var msgTime = Math.round(new Date().getTime() / 1000);//消息时间戳
    var subType;//消息子类型
    if (selType == webim.SESSION_TYPE.GROUP) {
        //群消息子类型如下：
        //webim.GROUP_MSG_SUB_TYPE.COMMON-普通消息,
        //webim.GROUP_MSG_SUB_TYPE.LOVEMSG-点赞消息，优先级最低
        //webim.GROUP_MSG_SUB_TYPE.TIP-提示消息(不支持发送，用于区分群消息子类型)，
        //webim.GROUP_MSG_SUB_TYPE.REDPACKET-红包消息，优先级最高
        subType = webim.GROUP_MSG_SUB_TYPE.COMMON;

    } else {
        //C2C消息子类型如下：
        //webim.C2C_MSG_SUB_TYPE.COMMON-普通消息,
        subType = webim.C2C_MSG_SUB_TYPE.COMMON;
    }
    var msg = new webim.Msg(selSess, isSend, seq, random, msgTime, loginInfo.identifier, subType, loginInfo.identifierNick);
    //解析文本和表情
    var expr = /\[[^[\]]{1,3}\]/mg;
    var emotions = msgtosend.match(expr);
    var text_obj, face_obj, tmsg, emotionIndex, emotion, restMsgIndex;
    if (!emotions || emotions.length < 1) {
        text_obj = new webim.Msg.Elem.Text(msgtosend);
        msg.addText(text_obj);
    } else {//有表情

        for (var i = 0; i < emotions.length; i++) {
            tmsg = msgtosend.substring(0, msgtosend.indexOf(emotions[i]));
            if (tmsg) {
                text_obj = new webim.Msg.Elem.Text(tmsg);
                msg.addText(text_obj);
            }
            emotionIndex = webim.EmotionDataIndexs[emotions[i]];
            emotion = webim.Emotions[emotionIndex];
            if (emotion) {
                face_obj = new webim.Msg.Elem.Face(emotionIndex, emotions[i]);
                msg.addFace(face_obj);
            } else {
                text_obj = new webim.Msg.Elem.Text(emotions[i]);
                msg.addText(text_obj);
            }
            restMsgIndex = msgtosend.indexOf(emotions[i]) + emotions[i].length;
            msgtosend = msgtosend.substring(restMsgIndex);
        }
        if (msgtosend) {
            text_obj = new webim.Msg.Elem.Text(msgtosend);
            msg.addText(text_obj);
        }
    }
    webim.sendMsg(msg, function (resp) {
        let content = null;
        if (selType === webim.SESSION_TYPE.C2C) {//私聊时，在聊天窗口手动添加一条发的消息，群聊时，长轮询接口会返回自己发的消息
            content = showMsg(msg);
        }
        // webim.Log.info("发消息成功");
        cbOk && cbOk(content);
        //cbOk, cbErr
        //hideDiscussForm();//隐藏评论表单
        //showDiscussTool();//显示评论工具栏
        //hideDiscussEmotion();//隐藏表情
    }, function (err) {
        cbErr && cbErr(err);
    });
}

//发送消息(群点赞消息)
function sendGroupLoveMsg() {

    if (!loginInfo.identifier) {//未登录
        if (accountMode == 1) {//托管模式
            //将account_type保存到cookie中,有效期是1天
            webim.Tool.setCookie('accountType', loginInfo.accountType, 3600 * 24);
            //调用tls登录服务
            tlsLogin();
        } else {//独立模式
            console.error('请填写帐号和票据');
        }
        return;
    }

    if (!selToID) {
        console.error("您还没有进入房间，暂不能点赞");
        return;
    }

    if (!selSess) {
        selSess = new webim.Session(selType, selToID, selToID, selSessHeadUrl, Math.round(new Date().getTime() / 1000));
    }
    var isSend = true;//是否为自己发送
    var seq = -1;//消息序列，-1表示sdk自动生成，用于去重
    var random = Math.round(Math.random() * 4294967296);//消息随机数，用于去重
    var msgTime = Math.round(new Date().getTime() / 1000);//消息时间戳
    //群消息子类型如下：
    //webim.GROUP_MSG_SUB_TYPE.COMMON-普通消息,
    //webim.GROUP_MSG_SUB_TYPE.LOVEMSG-点赞消息，优先级最低
    //webim.GROUP_MSG_SUB_TYPE.TIP-提示消息(不支持发送，用于区分群消息子类型)，
    //webim.GROUP_MSG_SUB_TYPE.REDPACKET-红包消息，优先级最高
    var subType = webim.GROUP_MSG_SUB_TYPE.LOVEMSG;

    var msg = new webim.Msg(selSess, isSend, seq, random, msgTime, loginInfo.identifier, subType, loginInfo.identifierNick);
    var msgtosend = 'love_msg';
    var text_obj = new webim.Msg.Elem.Text(msgtosend);
    msg.addText(text_obj);

    webim.sendMsg(msg, function (resp) {
        if (selType == webim.SESSION_TYPE.C2C) {//私聊时，在聊天窗口手动添加一条发的消息，群聊时，长轮询接口会返回自己发的消息
            showMsg(msg);
        }
        webim.Log.info("点赞成功");
    }, function (err) {
        webim.Log.error("发送点赞消息失败:" + err.ErrorInfo);
        console.error("发送点赞消息失败:" + err.ErrorInfo);
    });
}

//隐藏评论文本框
function hideDiscussForm() {
    //$(".video-discuss-form").hide();
}

//显示评论文本框
function showDiscussForm() {
    //$(".video-discuss-form").show();
}

//隐藏评论工具栏
function hideDiscussTool() {
    //$(".video-discuss-tool").hide();
}

//显示评论工具栏
function showDiscussTool() {
    //$(".video-discuss-tool").show();
}

//隐藏表情框
function hideDiscussEmotion() {
    //$(".video-discuss-emotion").hide();
    ////$(".video-discuss-emotion").fadeOut("slow");
}

//显示表情框
function showDiscussEmotion() {
    //$(".video-discuss-emotion").show();
    //$(".video-discuss-emotion").fadeIn("slow");

}

//展示点赞动画
function showLoveMsgAnimation() {
    //点赞数加1
    // var loveCount = $('#user-icon-like').html();
    // $('#user-icon-like').html(parseInt(loveCount) + 1);
    // var toolDiv = document.getElementById("video-discuss-tool");
    // var loveSpan = document.createElement("span");
    // var colorList = ['red', 'green', 'blue'];
    // var max = colorList.length - 1;
    // var min = 0;
    // var index = parseInt(Math.random() * (max - min + 1) + min, max + 1);
    // var color = colorList[index];
    // loveSpan.setAttribute('class', 'like-icon zoomIn ' + color);
    // toolDiv.appendChild(loveSpan);
}

//初始化表情
function initEmotionUL() {
    return;
    for (var index in webim.Emotions) {
        var emotions = $('<img>').attr({
            "id": webim.Emotions[index][0],
            "src": webim.Emotions[index][1],
            "style": "cursor:pointer;"
        }).click(function () {
            selectEmotionImg(this);
        });
        $('<li>').append(emotions).appendTo($('#emotionUL'));
    }
}

//打开或显示表情
function showEmotionDialog() {
    if (openEmotionFlag) {//如果已经打开
        openEmotionFlag = false;
        hideDiscussEmotion();//关闭
    } else {//如果未打开
        openEmotionFlag = true;
        showDiscussEmotion();//打开
    }
}

//选中表情
function selectEmotionImg(selImg) {
    $("#send_msg_text").val($("#send_msg_text").val() + selImg.id);
}

//退出大群
function quitBigGroup() {
    var options = {
        'GroupId': avChatRoomId//群id
    };
    webim.quitBigGroup(
        options,
        function (resp) {

            webim.Log.info('退群成功');
            selSess = null;
            //webim.Log.error('进入另一个大群:'+avChatRoomId2);
            //applyJoinBigGroup(avChatRoomId2);//加入大群
        },
        function (err) {
            console.error(err.ErrorInfo);
        }
    );
}

//登出
function logout() {
    //登出
    webim.logout(
        function (resp) {
            webim.Log.info('登出成功');
            loginInfo.identifier = null;
            loginInfo.userSig = null;
        }
    );
}


//监听 申请加群 系统消息
function onApplyJoinGroupRequestNotify(notify) {
    webim.Log.warn("执行 加群申请 回调：" + JSON.stringify(notify));
    var timestamp = notify.MsgTime;
    var reportTypeCh = "[申请加群]";
    var content = notify.Operator_Account + "申请加入你的群";
    showGroupSystemMsg(notify.ReportType, reportTypeCh, notify.GroupId, notify.GroupName, content, timestamp);
}

//监听 申请加群被同意 系统消息
function onApplyJoinGroupAcceptNotify(notify) {
    webim.Log.warn("执行 申请加群被同意 回调：" + JSON.stringify(notify));
    var reportTypeCh = "[申请加群被同意]";
    var content = notify.Operator_Account + "同意你的加群申请，附言：" + notify.RemarkInfo;
    showGroupSystemMsg(notify.ReportType, reportTypeCh, notify.GroupId, notify.GroupName, content, notify.MsgTime);
}

//监听 申请加群被拒绝 系统消息
function onApplyJoinGroupRefuseNotify(notify) {
    webim.Log.warn("执行 申请加群被拒绝 回调：" + JSON.stringify(notify));
    var reportTypeCh = "[申请加群被拒绝]";
    var content = notify.Operator_Account + "拒绝了你的加群申请，附言：" + notify.RemarkInfo;
    showGroupSystemMsg(notify.ReportType, reportTypeCh, notify.GroupId, notify.GroupName, content, notify.MsgTime);
}

//监听 被踢出群 系统消息
function onKickedGroupNotify(notify) {
    webim.Log.warn("执行 被踢出群  回调：" + JSON.stringify(notify));
    var reportTypeCh = "[被踢出群]";
    var content = "你被管理员" + notify.Operator_Account + "踢出该群";
    showGroupSystemMsg(notify.ReportType, reportTypeCh, notify.GroupId, notify.GroupName, content, notify.MsgTime);
}

//监听 解散群 系统消息
function onDestoryGroupNotify(notify) {
    webim.Log.warn("执行 解散群 回调：" + JSON.stringify(notify));
    var reportTypeCh = "[群被解散]";
    var content = "群主" + notify.Operator_Account + "已解散该群";
    showGroupSystemMsg(notify.ReportType, reportTypeCh, notify.GroupId, notify.GroupName, content, notify.MsgTime);
}

//监听 创建群 系统消息
function onCreateGroupNotify(notify) {
    webim.Log.warn("执行 创建群 回调：" + JSON.stringify(notify));
    var reportTypeCh = "[创建群]";
    var content = "你创建了该群";
    showGroupSystemMsg(notify.ReportType, reportTypeCh, notify.GroupId, notify.GroupName, content, notify.MsgTime);
}

//监听 被邀请加群 系统消息
function onInvitedJoinGroupNotify(notify) {
    webim.Log.warn("执行 被邀请加群  回调: " + JSON.stringify(notify));
    var reportTypeCh = "[被邀请加群]";
    var content = "你被管理员" + notify.Operator_Account + "邀请加入该群";
    showGroupSystemMsg(notify.ReportType, reportTypeCh, notify.GroupId, notify.GroupName, content, notify.MsgTime);
}

//监听 主动退群 系统消息
function onQuitGroupNotify(notify) {
    webim.Log.warn("执行 主动退群  回调： " + JSON.stringify(notify));
    var reportTypeCh = "[主动退群]";
    var content = "你退出了该群";
    showGroupSystemMsg(notify.ReportType, reportTypeCh, notify.GroupId, notify.GroupName, content, notify.MsgTime);
}

//监听 被设置为管理员 系统消息
function onSetedGroupAdminNotify(notify) {
    webim.Log.warn("执行 被设置为管理员  回调：" + JSON.stringify(notify));
    var reportTypeCh = "[被设置为管理员]";
    var content = "你被群主" + notify.Operator_Account + "设置为管理员";
    showGroupSystemMsg(notify.ReportType, reportTypeCh, notify.GroupId, notify.GroupName, content, notify.MsgTime);
}

//监听 被取消管理员 系统消息
function onCanceledGroupAdminNotify(notify) {
    webim.Log.warn("执行 被取消管理员 回调：" + JSON.stringify(notify));
    var reportTypeCh = "[被取消管理员]";
    var content = "你被群主" + notify.Operator_Account + "取消了管理员资格";
    showGroupSystemMsg(notify.ReportType, reportTypeCh, notify.GroupId, notify.GroupName, content, notify.MsgTime);
}

//监听 群被回收 系统消息
function onRevokeGroupNotify(notify) {
    webim.Log.warn("执行 群被回收 回调：" + JSON.stringify(notify));
    var reportTypeCh = "[群被回收]";
    var content = "该群已被回收";
    showGroupSystemMsg(notify.ReportType, reportTypeCh, notify.GroupId, notify.GroupName, content, notify.MsgTime);
}

//监听 用户自定义 群系统消息
function onCustomGroupNotify(notify) {
    webim.Log.warn("执行 用户自定义系统消息 回调：" + JSON.stringify(notify));
    var reportTypeCh = "[用户自定义系统消息]";
    var content = notify.UserDefinedField;//群自定义消息数据
    showGroupSystemMsg(notify.ReportType, reportTypeCh, notify.GroupId, notify.GroupName, content, notify.MsgTime);
}

//监听 群资料变化 群提示消息
function onGroupInfoChangeNotify(groupInfo) {
    webim.Log.warn("执行 群资料变化 回调： " + JSON.stringify(groupInfo));
    var groupId = groupInfo.GroupId;
    var newFaceUrl = groupInfo.GroupFaceUrl;//新群组图标, 为空，则表示没有变化
    var newName = groupInfo.GroupName;//新群名称, 为空，则表示没有变化
    var newOwner = groupInfo.OwnerAccount;//新的群主id, 为空，则表示没有变化
    var newNotification = groupInfo.GroupNotification;//新的群公告, 为空，则表示没有变化
    var newIntroduction = groupInfo.GroupIntroduction;//新的群简介, 为空，则表示没有变化

    if (newName) {
        //更新群组列表的群名称
        //To do
        webim.Log.warn("群id=" + groupId + "的新名称为：" + newName);
    }
}

//显示一条群组系统消息
function showGroupSystemMsg(type, typeCh, group_id, group_name, msg_content, msg_time) {
    var sysMsgStr = "收到一条群系统消息: type=" + type + ", typeCh=" + typeCh + ",群ID=" + group_id + ", 群名称=" + group_name + ", 内容=" + msg_content + ", 时间=" + webim.Tool.formatTimeStamp(msg_time);
    webim.Log.warn(sysMsgStr);
    console.error(sysMsgStr);
}

function init(opts) {
    accountMode = opts.accountMode;
    accountType = opts.accountType;
    sdkAppID = opts.sdkAppID;
    avChatRoomId = opts.avChatRoomId;
    selType = opts.selType;
    selToID = opts.selToID;
}

function getLastC2CHistoryMsgs(reqMsgCount, cbOk, cbError) {
    if (selType == webim.SESSION_TYPE.GROUP) {
        // alert('当前的聊天类型为群聊天，不能进行拉取好友历史消息操作');
        return;
    }
    var lastMsgTime = 0;//第一次拉取好友历史消息时，必须传 0
    var msgKey = '';
    var options = {
        'Peer_Account': selToID, //好友帐号
        'MaxCnt': reqMsgCount, //拉取消息条数
        'LastMsgTime': lastMsgTime, //最近的消息时间，即从这个时间点向前拉取历史消息
        'MsgKey': msgKey
    };
    webim.getC2CHistoryMsgs(
        options,
        function (resp) {
            var complete = resp.Complete;//是否还有历史消息可以拉取，1-表示没有，0-表示有
            var retMsgCount = resp.MsgCount;//返回的消息条数，小于或等于请求的消息条数，小于的时候，说明没有历史消息可拉取了
            if (resp.MsgList.length == 0) {
                webim.Log.error("没有历史消息了:data=" + JSON.stringify(options));
                return;
            }
            //保留服务器返回的最近消息时间和消息Key,用于下次向前拉取历史消息
            // getPrePageC2CHistroyMsgInfoMap[selToID] = {
            //   'LastMsgTime': resp.LastMsgTime,
            //   'MsgKey': resp.MsgKey
            // };
            cbOk && cbOk({
                historyMsgList: resp.MsgList,
                complete: complete === 0
            })

        },
        function () {
            cbError && cbError()
        }
    )
}

//上传图片
function uploadPic(imgFile, cbOk, cbErr) {
    var businessType;//业务类型，1-发群图片，2-向好友发图片
    if (selType == webim.SESSION_TYPE.C2C) {//向好友发图片
        businessType = webim.UPLOAD_PIC_BUSSINESS_TYPE.C2C_MSG;
    } else if (selType == webim.SESSION_TYPE.GROUP) {//发群图片
        businessType = webim.UPLOAD_PIC_BUSSINESS_TYPE.GROUP_MSG;
    }
    //封装上传图片请求
    var opt = {
        'file': imgFile, //图片对象
        // 'onProgressCallBack': onProgressCallBack, //上传图片进度条回调函数
        //'abortButton': document.getElementById('upd_abort'), //停止上传图片按钮
        'From_Account': loginInfo.identifier, //发送者帐号
        'To_Account': selToID, //接收者
        'businessType': businessType//业务类型
    };
    //上传图片
    webim.uploadPic(opt,
        function (resp) {
            //上传成功发送图片
            sendPic(resp, function (res) {
                cbOk && cbOk(res);
            }, function (res) {
                cbErr && cbErr(res.ErrorInfo);
            });
        },
        function (err) {
            cbErr && cbErr(err.ErrorInfo);
        }
    );
}

//发送图片
function sendPic(images, cbOk, cbErr) {
    if (!selToID) {
        alert("您还没有好友，暂不能聊天");
        return;
    }
    if (!selSess) {
        selSess = new webim.Session(selType, selToID, selToID, friendHeadUrl,
            Math.round(new Date().getTime() / 1000));
    }
    var msg = new webim.Msg(selSess, true);
    var images_obj = new webim.Msg.Elem.Images(images.File_UUID);
    for (var i in images.URL_INFO) {
        var img = images.URL_INFO[i];
        var newImg;
        var type;
        switch (img.PIC_TYPE) {
            case 1://原图
                type = 1;//原图
                break;
            case 2://小图（缩略图）
                type = 3;//小图
                break;
            case 4://大图
                type = 2;//大图
                break;
        }
        newImg = new webim.Msg.Elem.Images.Image(type, img.PIC_Size, img.PIC_Width,
            img.PIC_Height, img.DownUrl);
        images_obj.addImage(newImg);
    }
    msg.addImage(images_obj);
    //调用发送图片接口
    webim.sendMsg(msg, function (resp) {
        console.log(resp);
        cbOk && cbOk(showMsg(msg));
    }, function (err) {
        cbErr && cbErr(err.ErrorInfo);
    });
}

//上传文件(通过base64编码)
function uploadFileByBase64(digest, size, binary) {
    var businessType;//业务类型，1-发群文件，2-向好友发文件
    if (selType == webim.SESSION_TYPE.C2C) {//向好友发文件
        businessType = webim.UPLOAD_PIC_BUSSINESS_TYPE.C2C_MSG;
    } else if (selType == webim.SESSION_TYPE.GROUP) {//发群文件
        businessType = webim.UPLOAD_PIC_BUSSINESS_TYPE.GROUP_MSG;
    }
    //封装上传文件请求
    var opt = {
        'toAccount': selToID, //接收者
        'businessType': businessType,//文件的使用业务类型
        'fileType': webim.UPLOAD_RES_TYPE.FILE,//表示文件
        'fileMd5': digest, //文件md5
        'totalSize': size, //文件大小,Byte
        'base64Str': binary //文件base64编码

    };
    webim.uploadPicByBase64(opt,
        function (resp) {
            //alert('success');
            //发送文件
            console.log(resp);
            // sendFile(resp);
        },
        function (err) {
            alert(err.ErrorInfo);
        }
    );
}

//发送文件消息
function sendFile(file, fileName) {
    if (!selToID) {
        alert("您还没有好友，暂不能聊天");
        return;
    }

    if (!selSess) {
        selSess = new webim.Session(selType, selToID, selToID, friendHeadUrl, Math.round(new Date().getTime() / 1000));
    }
    var msg = new webim.Msg(selSess, true, -1, -1, -1, loginInfo.identifier, 0, loginInfo.identifierNick);
    var uuid = file.File_UUID;//文件UUID
    var fileSize = file.File_Size;//文件大小
    var senderId = loginInfo.identifier;
    var downloadFlag = file.Download_Flag;
    if (!fileName) {
        var random = Math.round(Math.random() * 4294967296);
        fileName = random.toString();
    }
    var fileObj = new webim.Msg.Elem.File(uuid, fileName, fileSize, senderId, selToID, downloadFlag, selType);
    msg.addFile(fileObj);
    //调用发送文件消息接口
    webim.sendMsg(msg, function (resp) {
        if (selType === webim.SESSION_TYPE.C2C) {//私聊时，在聊天窗口手动添加一条发的消息，群聊时，长轮询接口会返回自己发的消息
            addMsg(msg);
        }
    }, function (err) {
        alert(err.ErrorInfo);
    });
}

//加好友
function addFriend(fromAccount, toAccount, cbOk, cbErr) {
    var add_friend_item = [
        {
            'To_Account': toAccount,
            "AddSource": "AddSource_Type_Unknow",
            "AddWording": '你好，我们做朋友吧' //加好友附言，可为空
        }
    ];
    var options = {
        'From_Account': fromAccount,
        'AddFriendItem': add_friend_item
    };
    webim.applyAddFriend(options, function (res) {
        cbOk && cbOk(res);
    }, function (res) {
        cbErr && cbErr(res);
    });
}

//拉取申请好友请求
function cloneFriendRequest(fromAccount, cbOk, cbErr) {
    var options = {
        'From_Account': fromAccount,
        'PendencyType': 'Pendency_Type_ComeIn',
        'StartTime': 0,
        'MaxLimited': 10,
        'LastSequence': 0
    };
    webim.getPendency(options, function (res) {
        cbOk && cbOk(res);
    }, function (res) {
        cbErr && cbErr(res);
    });
}

//获取好友列表
function getFriendList(fromAccount, cbOk, cbErr) {
    var options = {
        'From_Account': fromAccount,
        'TimeStamp': 0,
        'StartIndex': 0,
        'GetCount': 10,
        'LastStandardSequence': 0,
        "TagList":
            [
                "Tag_Profile_IM_Nick",
                "Tag_SNS_IM_Remark"
            ]
    };
    webim.getAllFriend(
        options,
        function (resp) {
            cbOk && cbOk(resp);
        }, function (res) {
            cbErr && cbErr(res);
        });
}