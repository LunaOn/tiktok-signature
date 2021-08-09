const Signer = require("../index");
const axios = require('axios');

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

  const signer = new Signer();
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

    const csrf = await getCsrfToken(url, data.navigator.user_agent);
    console.log('get csrf', csrf);

    const response = await axios.get(data.signed_url, {
      headers:{
        "accept-encoding": "gzip, deflate",
        "cookie": "tt_webid_v2=1234567890; csrf_session_id=" + csrf.session_id,
        "Referer": "https://www.tiktok.com/",
        "user-agent": data.navigator.user_agent,
        "x-secsdk-csrf-token": csrf.token
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

function test() {
  feeds("1988", "MS4wLjABAAAAOUoQXeHglWcq4ca3MwlckxqAe-RIKQ1zlH9NkQkbLAT_h1_6SDc4zyPdAcVdTWZF", '0', 30).then(d => {
    console.log('feeds', d)
  }).catch(e => {
    console.error('get feeds error', e);
  });
}

// test();