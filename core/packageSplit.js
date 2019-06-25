// var fs = require('fire-fs');
var fs = require('fire-fs');
var path = require('path');
var shell = require("shelljs");
var UtilFs = Editor.require('packages://subpackage-tools/core/UtilFs.js');

let PROJECT_FILE = "project.manifest";
let VERSION_FILE = "version.manifest";

module.exports = {

    /**
     * 生成一个子包到保存目录
     * @param {*} packData 子包信息
     * @param {obj} manifestPath 主包清单文件
     * @param {string} buildPath 编译目录
     * @param {string} savePath 保存目录
     */
    generateSubpack(packData, mainManifestObj, buildPath, savePath, autoAtlas, buildResults) {
        if (!mainManifestObj || typeof mainManifestObj === "string") {    //其他参数不做检测
            Editor.error("generateSubpack:: mainManifestObj 参数错误");
            return;
        }
        //生成一个子包清单文件对象
        let subManifestObj = this.generateManifestObj(packData);
        //根据子包名 生成一个子包资源目录
        let subDir = path.join(savePath, packData.name)
        UtilFs.rmdirSync_R(subDir);     // 先移除目录 在写入
        UtilFs.mkdirSync_R(subDir);

        let mainAssets = mainManifestObj.assets;
        // console.log(mainManifestObj)
        Editor.log(buildPath + " => " + subDir);
        packData.resDirs.forEach((dirOrFile, index) => {
            if (dirOrFile == "") {
                Editor.warn("子包目录不存在::", dirOrFile);
                return;
            }

            autoAtlasUuids = this.getAutoAtlas(dirOrFile, autoAtlas);

            Editor.log("正在分离子包资源::" + dirOrFile);
            Editor.log("当前目录自动图集", autoAtlasUuids);
            let subUuids = this.getAllResUuid(dirOrFile, autoAtlas, autoAtlasUuids, buildResults);
            subUuids = subUuids.concat(autoAtlasUuids);        // 追加自定图集

            Editor.log("共 " + subUuids.length + " 个资源");

            subUuids.forEach((uuid, index) => {
                let isExists = false;    //判断资源是否存在
                for (let key in mainAssets) {
                    if (key.indexOf(uuid) != -1) {
                        isExists = true;
                        let d = mainAssets[key];
                        subManifestObj.assets[key] = d; //保存到子包清单文件中
                        delete mainAssets[key];     //从主清单文件中移除
                        let newFilePath = path.join(savePath, packData.name, key);
                        let oldFilePath = path.join(buildPath, key);
                        // Editor.log(oldFilePath + " => " + newFilePath)
                        //先创建目录
                        UtilFs.mkdirSync_R(path.dirname(newFilePath))
                        //移动文件
                        fs.renameSync(oldFilePath, newFilePath)//从主构建目录中移除资源到子包目录中
                    }
                }
                if (isExists === false) {
                    Editor.warn("主包清单列表不存在子包资源::" + uuid);
                }
            })


        })
        // console.log(mainAssets);
        //子包清单文件写入
        if (this.isEmptyObject(subManifestObj.assets)) {
            Editor.error("警告::" + packData.name + "子包资源清单为空");
        }
        fs.writeFileSync(path.join(subDir, PROJECT_FILE), JSON.stringify(subManifestObj));
        let verManifest = this.generateManifestObj(packData);
        delete verManifest.assets;
        delete verManifest.searchPaths;
        fs.writeFileSync(path.join(subDir, VERSION_FILE), JSON.stringify(verManifest));
        //主清单文件在外部写入

    },

    generateMainPack(packData, mainManifestObj, buildPath, savePath) {
        if (!mainManifestObj || typeof mainManifestObj === "string") {    //其他参数不做检测
            Editor.error("generateSubpack:: mainManifestObj 参数错误");
            return;
        }
        //生成一个子包清单文件对象
        let subManifestObj = this.generateManifestObj(packData);
        subManifestObj.assets = mainManifestObj.assets;
        //根据子包名 生成一个子包资源目录
        let subDir = path.join(savePath, packData.name)
        UtilFs.rmdirSync_R(subDir);     // 先移除目录 在写入
        UtilFs.mkdirSync_R(subDir);

        shell.cp("-R", path.join(buildPath, 'src'), path.join(subDir, "src"));
        shell.cp("-R", path.join(buildPath, 'res'), path.join(subDir, "res"));

        if (this.isEmptyObject(subManifestObj.assets)) {
            Editor.error("警告::" + packData.name + "子包资源清单为空");
        }
        fs.writeFileSync(path.join(subDir, PROJECT_FILE), JSON.stringify(subManifestObj));
        let verManifest = this.generateManifestObj(packData);
        delete verManifest.assets;
        delete verManifest.searchPaths;
        fs.writeFileSync(path.join(subDir, VERSION_FILE), JSON.stringify(verManifest));
        Editor.log("主包清单导入到项目");
        // 将版本文件导入到项目 assets 根目录
        Editor.assetdb.createOrSave('db://assets/' + PROJECT_FILE, JSON.stringify(subManifestObj));
        Editor.assetdb.createOrSave('db://assets/' + VERSION_FILE, JSON.stringify(verManifest));

    },


    /**
     * 生成一个manifest对象
     * @param {*} packData 
     */
    generateManifestObj(packData) {
        if (packData.packageUrl[packData.packageUrl.length - 1] != "/") {
            packData.packageUrl = packData.packageUrl + "/";
        }
        /**
         * 此处存在一个小Bug http:// 会被 path.join 转换成 http:/
         * 虽然可以被浏览器正确识别 但是在无法被 JAVA 代码: new URI(url)getHost()正确识别出 host ;
         * 导致 安卓 平台相关报错 貌似 IOS 和 win 没有影响
         * 
         */
        // let packageUrl = path.join(packData.packageUrl, packData.name);
        // let remoteManifestUrl = path.join(packageUrl, PROJECT_FILE);
        // let remoteVersionUrl = path.join(packageUrl, VERSION_FILE);
        let packageUrl = packData.packageUrl + packData.name;
        let remoteManifestUrl = packageUrl + "/" + PROJECT_FILE;
        let remoteVersionUrl = packageUrl + "/" + VERSION_FILE;

        let manifest = {
            version: packData.version,
            zhName: packData.zhName,        //追加保存中文名到manifest文件
            packageUrl: packageUrl,
            remoteManifestUrl: remoteManifestUrl,
            remoteVersionUrl: remoteVersionUrl,
            assets: {},
            searchPaths: []
        };
        return manifest;
    },
    getAllResUuid(dirOrFile, autoAtlas, autoAtlasUuids, buildResults) {
        // let resUuids = [];
        let resUuidsObj = Object.create(null);

        let files = UtilFs.readSync_R(dirOrFile);  //文件的绝对路径数组
        // Editor.log(files);
        // 排除自动图集中的精灵帧以及贴图的uuid
        excludeUuids = [];
        for (let i = 0; i < autoAtlasUuids.length; i++) {
            excludeUuids = excludeUuids.concat(autoAtlas[autoAtlasUuids[i]].containsSubAssets);
        }

        files.forEach((fsPath, index) => {
            // 
            // let fName = path.basename(fsPath)
            if (path.extname(fsPath) !== ".meta") {   //只处理meta文件
                return;
            }

            let resFileName = path.basename(fsPath, ".meta") //使用meta文件获取资源文件名
            // let fPath = path.join(dir, resFileName);
            //读取meta文件
            let metaObj = fs.readFileSync(fsPath);
            metaObj = JSON.parse(metaObj);
            // resUuids.push(metaObj.uuid);
            resUuidsObj[metaObj.uuid] = true;
            /**
             * 如果是图片资源还有一个子uuid 精灵帧uuid
             * 由于图片类型众多，此处不一一对应检测，直接检测是否存在subMeta对象
             * 备注: tupian.png.meta：metaObj.subMetas.tupian.uuid;详细请随意参考一个图片meta文件 
             */
            let key = path.basename(resFileName, path.extname(resFileName));
            if (metaObj.subMetas && metaObj.subMetas[key] && metaObj.subMetas[key].uuid) {     //如果是图片资源,还有一个子uuid
                if (excludeUuids.indexOf(metaObj.subMetas[key].uuid) >= 0) {
                    // resUuids.pop();     // 吐出贴图的uuid
                    delete resUuidsObj[metaObj.uuid];
                    return;
                }
                else {
                    resUuidsObj[metaObj.subMetas[key].uuid] = true;
                    // resUuids.push(metaObj.subMetas[key].uuid);
                }
            }

        });

        // return resUuids;
        return Object.keys(resUuidsObj);

    },
    /**
     * 判断对象是否是空的
     * 支持判断空数组
     * 支持判断空字符串
     * 警告:数字类型永远返回 true
     * @param {任意对象} obj 
     */
    isEmptyObject(obj) {
        for (var key in obj) return false
        return true
    },

    getAutoAtlas(dirOrFile, autoAtlas) {
        let res = []
        if (fs.statSync(dirOrFile).isDirectory()) {
            for (const autoAtlasuuid in autoAtlas) {
                if (autoAtlas.hasOwnProperty(autoAtlasuuid)) {
                    let obj = autoAtlas[autoAtlasuuid];
                    if (obj.rootDir.indexOf(dirOrFile) >= 0) {
                        res.push(autoAtlasuuid);
                    }
                }
            }
        }
        return res;
    },



};

