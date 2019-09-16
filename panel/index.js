// var fs = require('fire-fs');
var fs = require('fs');
var path = require('path');

var Electron = require('electron');
var packageSplit = Editor.require('packages://subpackage-tools/core/packageSplit.js');
var UtilConfig = Editor.require('packages://subpackage-tools/core/UtilConfig.js');
var UtilFs = Editor.require('packages://subpackage-tools/core/UtilFs.js');
let PROJECT_FILE = "project.manifest";
let VERSION_FILE = "version.manifest";




// panel/index.js, this filename needs to match the one registered in package.json
Editor.Panel.extend({

  style: fs.readFileSync(Editor.url('packages://subpackage-tools/panel/index.css', 'utf8')) + "",
  template: fs.readFileSync(Editor.url('packages://subpackage-tools/panel/index.html', 'utf8')) + "",


  // method executed when template and styles are successfully loaded and initialized
  ready() {
    this.vue = new window.Vue({
      el: this.shadowRoot,
      init: function () {
      },

      created: function () {
        //初始化面板数据
        let configData = UtilConfig.getConfigData();
        this.mainName = "Main";
        this.mainZhName = "主包";
        if (configData) {
          this.mainName = configData.mainName || "Main";
          this.mainZhName = configData.mainZhName || "主包";
          this.isDebug = configData.isDebug;
          this.mainVersion = configData.mainVersion;
          this.mainPackageUrl = configData.mainPackageUrl;
          this.manifestUrl = configData.manifestUrl;
          this.buildPath = configData.buildPath;
          this.packageSaveDir = configData.packageSaveDir;
          this.packages = configData.packages;

        }
      },



      data: {
        mainName: "",
        mainZhName: "",
        mainVersion: "0.0.1",
        mainPackageUrl: "http://127.0.0.1",
        buildPath: "这是编译目录",  //编译目录
        mainManifestObj: {},
        packageSaveDir: Editor.Project.path + "/subPackage",
        packages: [],
        isDebug: false,

        subPackageData: {
          name: "",
          zhName: "",
          zipImport: false,
          zipRawassets: false,
          isPrivate: true,
          version: "",
          packageUrl: "",
          manifestUrl: "",
          resDirs: [],  //资源路径
        },

      },
      methods: {
        addSubpack() {
          this.packages.push({
            name: "GG1",
            zhName: "游戏1",
            zipImport: false,
            zipRawassets: false,
            isPrivate: true,  // 默认子包都是私有的
            version: this.mainVersion,
            packageUrl: this.mainPackageUrl,
            // manifestUrl: this.manifestUrl,
            resDirs: [""],  //资源路径
          });
        },
        delSubpack(index) {
          if (confirm("确认要删除 子包 " + this.packages[index].name + " 吗?") === true) {
            this.packages.splice(index, 1);
          }
        },
        /**
         * 生成子包
         * 包括清单文件已经res资源文件夹已经文件
         * @param {subPackageData} pack 子包配置信息
         */
        generateSubpack(_callback) {
          callback = function () {
            if (typeof _callback == "function") {
              _callback();
              _callback = undefined;   // 防止多次回调
            }
          };
          if (!this._checkBuildPath()) {
            Editor.error("请设置正确的 build 路径");
            callback();
            return;
          }
          try {
            Editor.success("开始生成主包信息...");
            let manifestBase = packageSplit.generateManifestObj({
              name: this.mainName,
              version: this.mainVersion,
              zhName: this.mainZhName,
              packageUrl: this.mainPackageUrl,
              manifestUrl: this.manifestUrl,
            }, this.isDebug);

            mainManifestObj = this._genVersionObj(manifestBase, this.buildPath);
          }
          catch (error) {
            Editor.error(error);
            callback();
            return;
          }
          Editor.Ipc.sendToMain("subpackage-tools:getBuildResults", (err, data) => {
            if (data.isMD5Cache) {
              Editor.error("热更时 禁止 勾选 'MD5 Cache' 否则会造成代码(project.js)更新失效(下载成功但App任然使用旧代码)问题,具体查看热更官方文档以及论坛相关帖");
              Editor.log("以上问题可以通过修改 main.js 和 setting.js 动态添加 project.js文件名以及动态判断当前构建是否勾选 MD5Cache 再加上构建模板功能解决");
              Editor.log("如果你已经解决此问题,请直接修改插件代码,跳过判断");
              callback();
              return;
            }
            if (!err) {
              Editor.log("自动图集信息::", data.autoAtlas);

              try {
                let finish = 0;
                this.packages.forEach((pack, index) => {
                  pack = JSON.parse(JSON.stringify(pack));
                  pack.manifestUrl = this.manifestUrl;  // 补上清单文件地址

                  Editor.log("正在分离出子包::" + pack.name);
                  let packageSaveDir = this.packageSaveDir;
                  if (this.isDebug) {
                    packageSaveDir = path.join(this.packageSaveDir, "Debug");
                  }

                  packageSplit.generateSubpack(pack, mainManifestObj, this.buildPath, packageSaveDir, data.autoAtlas, data.buildResults, (err) => {
                    finish++;
                    if (err) {
                      console.error("分离子包发生错误::" + pack.name)
                      if (index == this.packages.length - 1) {
                        callback();
                      }
                      return;
                    }
                    let subDir = path.join(packageSaveDir, pack.name);
                    let manifestBaseObj = packageSplit.generateManifestObj(pack, this.isDebug);
                    let subManifestObj = this._genVersionObj(manifestBaseObj, subDir);

                    if (packageSplit.isEmptyObject(subManifestObj.assets)) {
                      Editor.error("警告::" + packData.name + "子包资源清单为空");
                    }
                    fs.writeFileSync(path.join(subDir, PROJECT_FILE), JSON.stringify(subManifestObj));
                    delete subManifestObj.assets;
                    delete subManifestObj.searchPaths;
                    fs.writeFileSync(path.join(subDir, VERSION_FILE), JSON.stringify(subManifestObj));
                    Editor.log(pack.name + " 分离完成");

                    // 完成所有子包打包工作
                    if (finish >= this.packages.length) {
                      Editor.log("正在生成主包.... ");
                      packageSplit.generateMainPack({
                        name: this.mainName,
                        version: this.mainVersion,
                        zhName: this.mainZhName,
                        packageUrl: this.mainPackageUrl,
                        manifestUrl: this.manifestUrl,
                      }, mainManifestObj, this.buildPath, packageSaveDir, this.isDebug);
                      this.genInitSubPackManifest();

                      //保存配置文件
                      this.saveConfig();
                      Editor.success("成功分离所有子包资源");
                      callback();
                    }
                  });
                });
              } catch (error) {
                Editor.error(error);
                callback();
                return;
              } finally {
              }
            }
            else {
              Editor.error("获取项目构建结果失败,请先构建项目", err);
              callback();
            }
          });

        },


        addResDir(pack) {
          pack.resDirs.push("");
        },
        delResDir(pack, index) {
          if (confirm("确认删除 资源目录\n" + pack.resDirs[index]) === true) {
            pack.resDirs.splice(index, 1);
          }
        },
        selectFile() {
          var filePath = UtilFs.selectFile();
          return filePath;
        },
        openDir(dir) {
          UtilFs.openDir(dir)
        },
        selectDir() {
          let dir = UtilFs.selectDir();
          return dir;
        },
        //选择子包资源目录
        onSelectSubResDir(resDirs, index) {
          var dir = UtilFs.selectDir();
          resDirs.splice(index, 1, dir);  //解决arr[index] = newValue时  Vue无法检测到更新问题
        },
        //选择子包单个资源
        onSelectSubRes(resDirs, index) {
          var filePath = UtilFs.selectFile();
          resDirs.splice(index, 1, filePath)
        },
        _checkBuildPath() {
          let buildPath = this.buildPath;
          if (fs.existsSync(path.join(buildPath, "res")) && fs.existsSync(path.join(buildPath, "src"))) {
            return true;
          }
          return false;
        },

        getConfigData() {
          return {
            mainName: this.mainName,
            mainZhName: this.mainZhName,
            mainVersion: this.mainVersion,
            mainPackageUrl: this.mainPackageUrl,
            manifestUrl: this.manifestUrl,
            buildPath: this.buildPath,
            packageSaveDir: this.packageSaveDir,
            isDebug: this.isDebug,
            packages: JSON.parse(JSON.stringify(this.packages))
          };
        },

        saveConfig() {
          UtilConfig.saveConfigData(this.getConfigData());
        },

        genInitSubPackManifest() {
          let rootDir = "db://assets/resources/Manifest/"

          this.packages.forEach((pack, packIndex) => {

            pack = JSON.parse(JSON.stringify(pack));
            pack.manifestUrl = this.manifestUrl;  // 补上清单文件地址

            let manifestObj = packageSplit.generateManifestObj(pack, this.isDebug);
            manifestObj.version = "0.0.1";    // 默认最小版本号
            delete manifestObj.assets;
            delete manifestObj.searchPaths;
            let url = rootDir + pack.name + "/"
            // 创建目录
            UtilFs.mkdirSync_R(Editor.url(url));
            Editor.assetdb.createOrSave(url + PROJECT_FILE, JSON.stringify(manifestObj));
            Editor.assetdb.createOrSave(url + VERSION_FILE, JSON.stringify(manifestObj));
          });
          let mainUrl = Editor.url(rootDir + "Main");
          if (!fs.existsSync(mainUrl)) {
            fs.mkdirSync(mainUrl);
          }

          Editor.log("子包初始化 manifest 文件保存在 " + rootDir);
        },

        /**
         * 生成热更新完整清单对象
         */
        _genVersionObj(manifestBaseObj, buildResourceDir) {

          let src = buildResourceDir;

          let readDir = function (dir, obj) {
            let stat = fs.statSync(dir);
            if (!stat.isDirectory()) {
              return;
            }
            let subpaths = fs.readdirSync(dir), subpath, size, md5, compressed, relative;
            for (let i = 0; i < subpaths.length; ++i) {
              if (subpaths[i][0] === '.') {
                continue;
              }
              subpath = path.join(dir, subpaths[i]);
              stat = fs.statSync(subpath);
              if (stat.isDirectory()) {
                readDir(subpath, obj);
              }
              else if (stat.isFile()) {
                // Size in Bytes
                size = stat['size'];
                // let crypto = require('crypto');
                md5 = require('crypto').createHash('md5').update(fs.readFileSync(subpath, 'binary')).digest('hex');
                compressed = path.extname(subpath).toLowerCase() === '.zip';

                relative = path.relative(src, subpath);
                relative = relative.replace(/\\/g, '/');
                relative = encodeURI(relative);
                obj[relative] = {
                  'size': size,
                  'md5': md5
                };
                if (compressed) {
                  obj[relative].compressed = true;
                }
              }
            }
          };

          let srcPath = path.join(src, 'src');
          let resPath = path.join(src, 'res');
          if (fs.existsSync(srcPath)) {
            readDir(srcPath, manifestBaseObj.assets);
          }
          if (fs.existsSync(resPath)) {
            readDir(resPath, manifestBaseObj.assets);
          }

          return manifestBaseObj;
        },
        /**
         * 校验私有包是否独立
         * 1.私有包的资源不允许被其他包引用
         * 2.被标记为公共包的包的资源才可以被其他包引用
         * 3.主包默认为公共包
         */
        checkPrivate(cb) {
          checkType = [
            "prefab",
            "scene",
            "animation-clip",
          ]

          let self = this;
          completeCount = 0;
          totalCount = 0;
          let isError = false;  // 标记是否存在引用私有子包资源的情况
          for (let i = 0; i < this.packages.length; i++) {
            if (!this.packages[i].isPrivate) {
              continue;
            }
            for (let j = 0; j < this.packages[i].resDirs.length; j++) {
              totalCount++;
            }
          }
          if (totalCount == 0) {
            Editor.log("没有需要检验的子包");
            if (typeof cb == "function") {
              cb(isError);
            }
            return;
          }
          this.packages.forEach((pack, packIndex) => {
            // Editor.log(pack.zhName);
            if (!pack.isPrivate) {
              return;
            }
            pack.resDirs.forEach((dirOrFile, resDirIndex) => {
              // Editor.log(dirOrFile);
              let url = Editor.assetdb.remote.fspathToUrl(dirOrFile);
              if (fs.statSync(dirOrFile).isDirectory()) {
                if (url.substr(-1) == "/") {
                  url += "**\/*";
                }
                else {
                  url = url + "/**\/*";
                }
              }

              Editor.assetdb.queryAssets(url, checkType, function (err, results) {
                completeCount++;
                if (!err && Array.isArray(results) && results.length > 0) {
                  results.forEach((result) => {
                    if (result.url.indexOf("db://internal/") >= 0) {    // 跳过引擎内置对象
                      return;
                    }
                    let logs = Object.create(null);
                    // Editor.log(result.url);
                    let dependUuids = Object.create(null);
                    let json = fs.readFileSync(result.path, "utf8");
                    let regExp = /"__uuid__":\s*"([a-zA-Z0-9-]*)"/g;  // 正则获取json中的__uuid__字段
                    let res = json.match(regExp);
                    // 获取 __uuid__ 的值
                    if (Array.isArray(res)) {
                      for (let i = 0; i < res.length; i++) {
                        let arr = res[i].split('"');
                        let uuid = arr[3];
                        dependUuids[uuid] = true;
                      }
                    }
                    Object.keys(dependUuids).forEach((uuid, index) => {
                      let path_ = Editor.remote.assetdb.uuidToFspath(uuid);
                      if (typeof path_ == "string") {
                        self.packages.forEach((p, i) => {
                          p = self.packages[i];
                          if (i == packIndex || !p.isPrivate) {
                            return;
                          }

                          p.resDirs.forEach((dof) => {
                            if (path_.indexOf(dof) >= 0) {
                              // Editor.log(path_);
                              logs[path_] = true;
                            }
                          })
                        })

                      }

                    })

                    let logarr = Object.keys(logs);
                    if (logarr.length > 0) {
                      isError = true;
                      Editor.error(result.url + " 引用了以下私有资源::");
                      for (let i = 0; i < logarr.length; i++) {
                        Editor.log(logarr[i]);
                      }
                    }
                  })
                }
                if (completeCount == totalCount) {
                  Editor.success("检验结束 " + (isError ? "失败" : "成功"));
                  if (typeof cb == "function") {
                    cb(isError);
                  }
                }
              })


            })

          })


        }

      }
    })

  },




  // register your ipc messages here
  messages: {

    '_generateSubpack'(event) {
      Editor.success("开始检验子包私有性");
      this.vue.checkPrivate((isError) => {
        if (!isError) {
          this.vue.generateSubpack(() => {
            // Editor.success("构建完成");
            if (event.reply) {
              event.reply();
            }
          });
        }
        else {
          Editor.error("生成子包失败,子包私有性校验失败");
          if (event.reply) {
            event.reply();
          }
        }

      });

    }



  }
});