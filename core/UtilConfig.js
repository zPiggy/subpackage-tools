let fs = require('fire-fs');
let path = require('fire-path');
let electron = require('electron');
let UtilFs = Editor.require('packages://subpackage-tools/core/UtilFs.js');


module.exports = {
    CONF_PATH: "settings",
    CONF_FILE_NAME: "subPackagesConfig.json",

    /**
     * 读取配置数据信息
     */
    getConfigData() {
        let projectRoot = Editor.Project.path;

        let confDir = path.join(projectRoot, this.CONF_PATH);
        let confPath = path.join(confDir, this.CONF_FILE_NAME);
        if (!fs.existsSync(confDir)) {
            UtilFs.mkdirSync_R(confDir);//创建一个目录
            return undefined;
        }
        else if (!fs.existsSync(confPath)) {
            return undefined;
        }
        else {
            let res = fs.readFileSync(confPath, "utf8");
            let configData = JSON.parse(res);
            // 将相对路径转绝对路径
            configData.packageSaveDir = UtilFs.getAbsolutePath(configData.packageSaveDir);
            configData.buildPath = UtilFs.getAbsolutePath(configData.buildPath);
            let packages = configData.packages;
            packages.forEach((pack, index) => {
                for (let i = 0; i < pack.resDirs.length; i++) {
                    pack.resDirs[i] = UtilFs.getAbsolutePath(pack.resDirs[i]);
                }
            });

            return configData;
        }

    },
    /**
     * 保存配置信息到文件
     * @param {*} configData 
     */
    saveConfigData(configData) {
        if (!configData) {
            return;
        }
        let projectRoot = path.dirname(Editor.url("db://assets"));

        let confDir = path.join(projectRoot, this.CONF_PATH);
        let confPath = path.join(confDir, this.CONF_FILE_NAME);
        if (!fs.existsSync(confDir)) {
            UtilFs.mkdirSync_R(confDir);//创建一个目录
        }
        // 绝对路径转相对路径
        configData.packageSaveDir = UtilFs.getRelativePath(configData.packageSaveDir);
        configData.buildPath = UtilFs.getRelativePath(configData.buildPath);
        let packages = configData.packages;
        packages.forEach((pack, index) => {
            for (let i = 0; i < pack.resDirs.length; i++) {
                pack.resDirs[i] = UtilFs.getRelativePath(pack.resDirs[i]);
            }
        });


        let ret = fs.writeFileSync(confPath, JSON.stringify(configData));
        Editor.log("配置文件保存成功 " + confPath);
    },
    /**
     * 清楚配置文件
     */
    cleanConfigData() {
        let projectRoot = path.dirname(Editor.url("db://assets"));

        let confDir = path.join(projectRoot, this.CONF_PATH);
        let confPath = path.join(confDir, this.CONF_FILE_NAME);
        if (!fs.existsSync(confDir)) {
            UtilFs.mkdirSync_R(confDir);//创建一个目录
            return;
        }
        else if (!fs.existsSync(confPath)) {
            return;
        }

        fs.unlink(confPath);
    },



}