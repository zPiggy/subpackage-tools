// var fs = require('fire-fs');
var fs = require('fire-fs');
var path = require('path');
var shell = require("shelljs");
var JSZip = require('jszip');

var UtilFs = Editor.require('packages://subpackage-tools/core/UtilFs.js');

let PROJECT_FILE = "project.manifest";
let VERSION_FILE = "version.manifest";

let ZIP_COMMON_DATE = new Date(1);  // zip压缩时采用的公共 文件修改时间

module.exports = {

    /**
     * 生成一个子包到保存目录
     * @param {*} packData 子包信息
     * @param {obj} manifestPath 主包清单文件
     * @param {string} buildPath 编译目录
     * @param {string} savePath 保存目录
     */
    generateSubpack(packData, mainManifestObj, buildPath, savePath, autoAtlas, buildResults, callback) {
        if (!mainManifestObj || typeof mainManifestObj === "string") {    //其他参数不做检测
            Editor.error("generateSubpack:: mainManifestObj 参数错误");
            return;
        }
        //根据子包名 生成一个子包资源目录
        let subDir = path.join(savePath, packData.name)
        UtilFs.rmdirSync_R(subDir);     // 先移除目录 在写入
        UtilFs.mkdirSync_R(subDir);

        let mainAssets = mainManifestObj.assets;
        // console.log(mainManifestObj)
        Editor.log(buildPath + " => " + subDir);
        let zip;

        // 将子包资源移动到对应子包目录
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

        // 打包成 zip 
        if (packData.zipImport || packData.zipRawassets) {
            Editor.log("正在zip...");
            let rootDir = path.join(subDir, "res");
            let finish = 0;
            let total = 0;
            if (packData.zipImport) {
                total++;
                this.packageZip(rootDir, "import", (err) => {
                    finish++;
                    // 不管是不是成功, 移除被zip的目录
                    UtilFs.rmdirSync_R(path.join(rootDir, "import"));
                    if (err) {
                        Editor.error("zip import 失败::" + packData.name, err);
                    }
                    else {
                        Editor.log("zip import 成功::" + packData.name);
                    }
                    if (finish >= total) {
                        callback && callback();
                        callback = undefined;
                    }
                })
            }
            if (packData.zipRawassets) {
                total++;
                this.packageZip(rootDir, "raw-assets", (err) => {
                    finish++;
                    // 不管是不是成功, 移除被zip的目录
                    UtilFs.rmdirSync_R(path.join(rootDir, "raw-assets"));
                    if (err) {
                        Editor.error("zip raw-assets 失败::" + packData.name, err);
                    }
                    else {
                        Editor.log("zip raw-assets 成功::" + packData.name);
                    }
                    if (finish >= total) {
                        callback && callback();
                        callback = undefined;
                    }
                })
            }
        }
        else {
            callback && callback();
        }

    },

    generateMainPack(packData, mainManifestObj, buildPath, savePath, isDebug) {
        if (!mainManifestObj || typeof mainManifestObj === "string") {    //其他参数不做检测
            Editor.error("generateSubpack:: mainManifestObj 参数错误");
            return;
        }
        //生成一个子包清单文件对象
        let subManifestObj = this.generateManifestObj(packData, isDebug);
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
        let verManifest = this.generateManifestObj(packData, isDebug);
        delete verManifest.assets;
        delete verManifest.searchPaths;
        fs.writeFileSync(path.join(subDir, VERSION_FILE), JSON.stringify(verManifest));
        let manifestPath = "db://assets/resources/Manifest/Main/";
        Editor.log("主包清单导入到项目:: " + manifestPath);
        // 将版本文件导入到项目 assets 根目录
        Editor.assetdb.createOrSave(manifestPath + PROJECT_FILE, JSON.stringify(subManifestObj));
        Editor.assetdb.createOrSave(manifestPath + VERSION_FILE, JSON.stringify(verManifest));

    },


    /**
     * 生成一个manifest对象
     * @param {*} packData 
     */
    generateManifestObj(packData, isDebug) {
        let packageUrl = packData.packageUrl;
        let manifestUrl = packData.manifestUrl;
        if (packageUrl[packageUrl.length - 1] != "/") {
            packageUrl = packageUrl + "/";
        }
        if (manifestUrl[manifestUrl.length - 1] != "/") {
            manifestUrl = manifestUrl + "/";
        }

        if (isDebug) {
            packageUrl += "Debug/";
            manifestUrl += "Debug/";
        }
        packageUrl = packageUrl + packData.name;
        manifestUrl = manifestUrl + packData.name;
        // 单独设置 manifest 文件地址
        let remoteManifestUrl = manifestUrl + "/" + PROJECT_FILE;
        let remoteVersionUrl = manifestUrl + "/" + VERSION_FILE;

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

    zipDir(dir, zipObj) {
        // Editor.log(dir);
        let files = fs.readdirSync(dir);
        // Editor.log("ok", files);
        for (let i = 0; i < files.length; i++) {
            let file = files[i];
            if (file == "." || file == "..") {
                continue;
            }
            let fullPath = path.join(dir, file);
            let stat = fs.statSync(fullPath);
            // console.log("判断文件类型::" + fullPath);
            if (stat.isFile()) {
                /**
                 * zip文件的MD5会计算每一个文件的最后修改时间 由于子包中的每一个文件都是在每次构建时重新生成这将导致MD5始终不一致
                 * 所以此处忽略文件的修改时间(写死一个固定的时间)
                 */
                zipObj.file(file, fs.readFileSync(fullPath), { date: ZIP_COMMON_DATE });
            } else if (stat.isDirectory()) {
                zipObj.file(file, null, { dir: true, date: ZIP_COMMON_DATE });
                // Editor.log("这是一个目录::" + file);
                this.zipDir(fullPath, zipObj.folder(file));
            }
        }
    },

    packageZip(rootDir, dir, callback) {
        let zip = new JSZip();
        zip.file(dir, null, { dir: true, date: ZIP_COMMON_DATE });

        this.zipDir(path.join(rootDir, dir), zip.folder(dir));
        let destFile = path.join(rootDir, dir + ".zip");

        fs.existsSync(destFile) && (fs.unlinkSync(destFile));

        zip.generateNodeStream({
            type: "nodebuffer",
            streamFiles: !0
        }).pipe(fs.createWriteStream(destFile)).on("finish",
            function () {
                // Editor.error("zip成功:: " + packData.name);
                callback && callback(null);
            }.bind(this)).on("error",
                function (e) {
                    // Editor.error("zip失败:: " + packData.name, e);
                    callback && callback(e);
                }.bind(this));
    }



};

