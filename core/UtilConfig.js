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
        let projectRoot = path.dirname(Editor.url("db://assets"));  // Editor.projectPath只能在主进程中使用 此处取巧获取项目根目录 

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
            return JSON.parse(res);
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