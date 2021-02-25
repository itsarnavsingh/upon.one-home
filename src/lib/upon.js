export class Upon {
  constructor(configuration) {
    this.info = {}; //to do differentiation

    this.configuration = {
      fees: {},
    };
    Object.assign(this.configuration, configuration ? configuration : {});
    this.files = {};
    this.currentPrompt = {};
    this.borderRadius = "5px";
    this.request_callbacks = {};
    this.listen_callbacks = {};
    this.socket = {};
    this.socketData = { query: [], room: [] };
    this.socketFunctions = { query: {}, room: {} };
    this.receivingStatus = false;
    this.loginCallback = null;

    this.api = {
      post: (route, body) => {
        return this.query(route, body, "POST");
      },
      get: (route) => {
        return this.query(route, null, "GET");
      },
    };

    this.loadingSVG = `
      <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style="margin: auto; background: transparent; display: block; shape-rendering: auto;" width="100px" height="100px" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid">
      <g transform="rotate(0 50 50)">
        <rect x="32" y="29.5" rx="18" ry="0.5" width="36" height="1" fill="#0a0a0a">
          <animate attributeName="opacity" values="1;0" keyTimes="0;1" dur="1s" begin="-0.6666666666666666s" repeatCount="indefinite"/>
        </rect>
      </g><g transform="rotate(120 50 50)">
        <rect x="32" y="29.5" rx="18" ry="0.5" width="36" height="1" fill="#0a0a0a">
          <animate attributeName="opacity" values="1;0" keyTimes="0;1" dur="1s" begin="-0.3333333333333333s" repeatCount="indefinite"/>
        </rect>
      </g><g transform="rotate(240 50 50)">
        <rect x="32" y="29.5" rx="18" ry="0.5" width="36" height="1" fill="#0a0a0a">
          <animate attributeName="opacity" values="1;0" keyTimes="0;1" dur="1s" begin="0s" repeatCount="indefinite"/>
        </rect>
      </g>
      <!-- [ldio] generated by https://loading.io/ --></svg>`;

    // this.declareComponents = this.declareComponents.bind(this)

    // window.addEventListener('load',this.declareComponents)

    //----------------------Set cookie from url param----------------------------------------

    if (!this.configuration.disableGoogleAnalytics) {
      let anaScript = document.createElement("script");
      anaScript.innerHTML = `
      (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
        (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
        m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
        })(window,document,'script','https://www.google-analytics.com/analytics.js','ga');
        
        ga('create', 'UA-166276820-1', 'auto');
        ga('send', 'pageview');
      `;
      document.head.appendChild(anaScript);
    }
    if (this.getUrlParam("cookie")) {
      localStorage.setItem("user-cookie", this.getUrlParam("cookie"));
    }

    this.info.host = "upon.one";
    this.info.port = 80;

    if (!this.configuration.name)
      if (document.querySelector("title")) {
        this.configuration.name = document
          .querySelector("title")
          .innerHTML.split(" ")[0]
          .toLowerCase();
      }

    if (!global.Upon_instance) {
      global.Upon_instance = {};
    }

    if (this.configuration.name)
      global.Upon_instance[this.configuration.name] = this;

    if (
      window.location.origin.indexOf("upon.one") !== -1 ||
      window.location.origin.indexOf("localhost.com") !== -1
    ) {
      this.configuration.job = "receive";
    }

    this.updateServerLink();

    if (this.configuration.job !== "receive") {
      this.configuration.job = "host";
    }
  }
  settings = (configuration) => {
    Object.assign(this.configuration, configuration ? configuration : {}); //transfer all variables of arg 1 into this.configuration
    this.configuration.name = this.configuration.name.toLowerCase();

    global.Upon_instance[this.configuration.name] = this;

    this.updateServerLink();
  };
  collection = (collectionName) => {
    let U = this;
    return new (class {
      constructor() {
        this.collectionName = collectionName;
        this.find = this.find.bind(this);
        this.search = this.search.bind(this);
        this.update = this.update.bind(this);
        this.delete = this.delete.bind(this);
        this.getQuery = this.getQuery.bind(this);
      }

      getQuery(where, put, aditionalQuery) {
        if (!aditionalQuery) aditionalQuery = {};
        return Object.assign(
          { on: this.collectionName, where: where, put: put },
          aditionalQuery
        );
      }

      find(where, aditionalQuery) {
        aditionalQuery.action = "find";
        return U.api.post(
          "query-database",
          this.getQuery(where, null, aditionalQuery)
        );
      }

      search(where, aditionalQuery) {
        aditionalQuery.action = "search";
        return U.api.post(
          "query-database",
          this.getQuery(where, null, aditionalQuery)
        );
      }

      count(where, aditionalQuery) {
        aditionalQuery.action = "count";
        return U.api.post(
          "query-database",
          this.getQuery(where, null, aditionalQuery)
        );
      }

      remove(where, aditionalQuery) {
        aditionalQuery.action = "remove";
        return U.api.post("query-database", this.getQuery(where));
      }

      update(where, put, aditionalQuery) {
        aditionalQuery.action = "update";
        return U.api.post("query-database", this.getQuery(where, put));
      }

      write(put, aditionalQuery) {
        aditionalQuery.action = "write";
        return U.api.post("query-database", this.getQuery(null, put));
      }
    })();
  };

  updateServerLink = () => {
    if (
      window.location.host.indexOf("localhost.com:8080") !== -1 ||
      this.configuration.local
    ) {
      this.info.host = "localhost.com";
      this.info.port = 8080;
    }

    let portString = this.info.port === 80 ? "" : ":" + this.info.port;

    this.info.serverUrl =
      `${window.location.protocol}//${this.configuration.name}.` +
      this.info.host +
      portString;
  };

  query = async (route, body, requestType) => {
    if (!requestType) requestType = "POST";
    let headerParam = {
      withCredentials: true,
      authorization: this.getUserCookie()
        ? "Bearer " + this.getUserCookie()
        : "",
      "Content-type": "application/json",
    };

    let requestObject = {
      method: requestType,
      headers: headerParam,
    };

    if (body) requestObject.body = JSON.stringify(body);

    let res = await fetch(
      this.info.serverUrl + "/api/v1/" + route,
      requestObject
    );

    let jsonData = await res.json();

    if (jsonData.error) throw Error(jsonData.error);
    return jsonData.data;
  };

  random() {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }

  logout = () => {
    let type = "user";
    localStorage.removeItem(type);
    localStorage.removeItem(type + "-cookie");
    window.location.href =
      this.getAppUrl("auth") +
      `/logout/?logout=true&redirectLink=${window.location.origin}`;
  };

  getLoggedInUser = () => {
    return new Promise((resolve) => {
      let type = "user";
      if (!this.getUserCookie()) return resolve();

      if (localStorage.getItem(type)) {
        let whole = JSON.parse(localStorage.getItem(type));
        return resolve(whole);
      } else {
        this.api
          .get("logged-in-user")
          .then((userData) => {
            if (!userData) return resolve(false);
            localStorage.setItem(type, JSON.stringify(userData));
            return resolve(userData);
          })
          .catch(console.error);
      }
    });
  };
  fromPhone() {
    let width = window.innerWidth > 0 ? window.innerWidth : window.screen.width;
    if (width < 500) return true;
    return false;
  }
  setMetaTag(findBY, attributeToAssign) {
    let key = Object.keys(findBY)[0];
    let metaTag = document.querySelector(`meta[${key}="${findBY[key]}"]`);
    if (metaTag) {
      for (let key in attributeToAssign) {
        metaTag.setAttribute(key, attributeToAssign[key]);
      }
    } else {
      metaTag = document.createElement("meta");

      let attributes = Object.assign(findBY, attributeToAssign);
      for (let key in attributes) {
        metaTag.setAttribute(key, attributes[key]);
      }

      document.head.appendChild(metaTag);
    }
  }
  getAppUrl = (app) => {
    return `http://${app}.${this.info.host}:${this.info.port}`;
  };

  CDN = (path) => {
    return `${this.info.serverUrl}/cdn/${path}`;
  };
  login = () => {
    if (this.getUrlParam("cookie"))
      throw Error("Error: Cookie alredy generated ");
    return (window.location.href =
      this.getAppUrl("auth") +
      `/authenticate/?appName=${this.configuration.name}&redirectLink=${window.location.href}`);
  };
  changeProfilePicture = () => {
    if (!this.getUserCookie()) throw Error("Login required");
    return (window.location.href =
      this.getAppUrl("auth") +
      `/change-profile-picture/?redirectLink=${window.location.href}`);
  };
  getProfilePicture = (userId) => {
    if (!userId) {
      userId = "user";
    }
    return (
      this.getAppUrl("www") +
      "/profilePicture/" +
      userId +
      ".jpg?disableChache=" +
      this.random()
    );
  };

  getUserCookie() {
    let type = "user";
    if (localStorage.getItem(type + "-cookie")) {
      return localStorage.getItem(type + "-cookie");
    }
    return false;
  }
  caps(s) {
    if (typeof s !== "string") return "";
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  getUrlParam(property) {
    let getUrlParam = window.location.search
      .replace("?", "")
      .split("&")
      .map((item) => {
        let part = item.split("=");
        let val = {};
        val[part[0]] = part[1];
        return val;
      });

    let paramObject = {};
    for (let index of getUrlParam) {
      paramObject = Object.assign(paramObject, index);
    }
    return paramObject[property];
  }
  upload = async (file, bucketName, originalFileName, attribute = {}) => {
    let form = new FormData();

    if (originalFileName) form.append("originalFileName", originalFileName); //for replacing
    form.append("bucket", bucketName);

    for (let key in attribute) {
      form.append(key, attribute[key]);
    }

    //originalFileName is for declaring the file which needs to be replaced
    //on the server side the file.filename is for finding extension
    //file.filename is set automatically by the browser if we don't overwrite them
    //but when we create blob (in case of hosting upload) it does not happens automatically
    //if originalFileName is undefined it is automatically extracted from file.filename by multer

    let nameUsedForExtension = originalFileName ? originalFileName : file.name;
    form.append("file", file, nameUsedForExtension); //if it was appended before the other appends then req.body will not be processed instantly

    let endPoint = "/upload";
    if (bucketName === "profilePicture") endPoint = "/uploadProfilePicture";
    if (bucketName === "hostingUpload") endPoint = "/hostingUpload";

    let headerParam = {
      authorization: this.getUserCookie()
        ? "Bearer " + this.getUserCookie()
        : "",
    };

    let response = await fetch(this.info.serverUrl + endPoint, {
      method: "POST",
      body: form,
      headers: headerParam,
    });

    let postData = await response.json();
    if (postData.error) throw Error(postData.error);
    return postData.data;
  };
}

export let U = new Upon();

global.U = U;
global.Upon = Upon;

//send auth header
