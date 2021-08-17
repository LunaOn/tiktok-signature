const Signer = require("../index");
const axios = require('axios');
// 测试机器人url
// const larkRobotUrl = "https://open.larksuite.com/open-apis/bot/v2/hook/6b980745-4c12-4e79-98eb-028e18836e6e"

// 接口报告群机器人url
const larkRobotUrl = "https://open.larksuite.com/open-apis/bot/v2/hook/c7647be4-0d05-4448-9e49-4ea254ac0ac8"

async function getCsrfToken(url, userAgent) {
  const response = await axios.head(url, {
    responseType: "text",
    headers: {
      "x-secsdk-csrf-version": "1.2.5",
      "x-secsdk-csrf-request": "1",
      "User-Agent": userAgent,
    },
  })
  console.log('head response headers', response.headers);

  return {
    session_id: response.headers['set-cookie'][0].split(';')[0].split('=')[1],
    token: response.headers['x-ware-csrf-token'],
  }
}

async function feeds(aid, secUid, cursor='0', count=30) {
  const url = "https://m.tiktok.com/api/post/item_list/?aid="+aid+"&count="+count+"&secUid="+secUid+"&cursor="+cursor;

  const signer = new Signer("https://www.apple.com/");
  await signer.init();

  try {
    const sign = await signer.sign(url);
    const navigator = await signer.navigator();

    const data = {
      signature: sign.signature,
      verify_fp: sign.verify_fp,
      signed_url: sign.signed_url,
      navigator: navigator,
    };
    console.log("sign data", data);

    // const csrf = await getCsrfToken(url, data.navigator.user_agent);
    // console.log('get csrf', csrf);

    const response = await axios.get(data.signed_url, {
      headers:{
        "accept-encoding": "gzip, deflate",
        // "cookie": "tt_webid_v2=1234567890; csrf_session_id=" + csrf.session_id,
        // "cookie": "tt_webid_v2=1234567890; csrf_session_id=12312312",
        "Referer": "https://www.tiktok.com/",
        "user-agent": data.navigator.user_agent,
        // "x-secsdk-csrf-token": csrf.token
      }
    })
    // console.log("feeds response", response.data); // too large

    await signer.close();
    return response.data
  } catch (e) {
    await signer.close();
    throw e;
  }
}

// 发送飞书消息，con参数为消息内容
function larkSend(con){
  return new Promise((resolve, reject) => {
    var axios = require('axios');
    var config = {
      method: 'post',
      url: larkRobotUrl,
      headers: {
        'Content-Type': 'application/json'
      },
      data : con
    };

    axios(config)
      .then(function (response) {
        console.log(JSON.stringify(response.data));
        console.log("success")
        resolve(response);
      })
      .catch(function (error) {
        console.log(error);
        console.log("fail")
        reject(error)
      });
  })
}


async function test() {
  try {
    const d = await feeds("1988", "MS4wLjABAAAAOUoQXeHglWcq4ca3MwlckxqAe-RIKQ1zlH9NkQkbLAT_h1_6SDc4zyPdAcVdTWZF", '0', 30);
    const con = JSON.stringify({
      "msg_type": "text",
      "content": {
        "text":
          "tiktok feeds拉取api监控" +
          "\n\nauthor_id: 6896939896755176449" +
          "\n请求拉取feeds数量: 30" +
          "\n实际拉取feeds数量: " + d.itemList.length
      }
    })
    // 请求成功的消息
    if(30 != d.itemList.length){await larkSend(con)}
    console.log('feeds', d)
    process.exit(0)
  } catch (e) {
    console.error('get feeds error', e);
    const con = JSON.stringify({
      "msg_type": "text",
      "content": {
        "text": "tiktok feeds拉取api监控\n" + JSON.stringify(e)
      }
    });
    // 发送失败信息
    try {
      await larkSend(con);
    } catch (e) {
      console.log("send lark failed");
    }
    process.exit(0)
  }
}

// 定时循环执行，单位为毫秒,两小时为7200000
// setInterval(test,7200000);
test();
