
let fs = require('fs');
let path = require('path');
var Electron = require('electron');


module.exports = {
    readSync_R(dirOrFile) {
        if (!fs.existsSync(dirOrFile)) {
            Editor.log("文件或者目录不存在::" + dirOrFile);
            return [];
        }
        let stat = fs.statSync(dirOrFile);
        if (stat.isDirectory() === true) {
            return this.readdirSync_R(dirOrFile)
        }
        // else if (stat.isFile() === true) {
        else {  //如果是单个文件 则必须还有一个meta文件,否则异常
            let metaFile = dirOrFile + ".meta";
            if (fs.existsSync(metaFile)) {
                return [dirOrFile, metaFile];
            }

        }
    },
    /**
     * 递归读取一个目录(结果不包括文件夹和.开头的文件)
     * @param {string} dir 
     * @return {string[]} files 所有文件绝对路径
    */
    readdirSync_R(dir) {
        let files = [];     //所有文件的路径
        function readDirAllFiles(dir) {
            let res = fs.readdirSync(dir);
            res.forEach(function (fName, index) {
                if (fName[0] === '.') {   //剔除.开头的隐藏文件和文件夹
                    return;
                }
                let fPath = path.join(dir, fName);  //拼成完整路径
                // 排除目录的 meta 文件
                if (path.extname(fPath) == ".meta") {
                    let dir = fPath.split(".meta")[0];
                    if (fs.statSync(dir).isDirectory()) {
                        return;
                    }
                }

                let stat = fs.statSync(fPath);
                if (stat.isDirectory() === true) {
                    readDirAllFiles(fPath);
                }
                else if (stat.isFile() === true) {
                    files.push(fPath);
                }
            });
        }
        readDirAllFiles(dir);
        return files;
    },

    /**
     * 递归创建一个目录
     * @param {string} dir 
     */
    mkdirSync_R(dir) {
        if (fs.existsSync(dir)) {
            return true;
        } else {
            if (this.mkdirSync_R(path.dirname(dir))) {
                fs.mkdirSync(dir);
                return true;
            }
        }
    },
    /**
     * 递归删除一个目录
     * @param {string} dir 
     */
    rmdirSync_R(dir) {
        var files = [];
        if (fs.existsSync(dir)) {
            files = fs.readdirSync(dir);
            files.forEach((file, index) => {
                var curPath = path.join(dir, file);
                if (fs.statSync(curPath).isDirectory()) { // recurse
                    this.rmdirSync_R(curPath);
                } else { // 删除文件
                    fs.unlinkSync(curPath);
                }
            });
            fs.rmdirSync(dir);  //删除目录
        }
    },


    /**
     * 打开(显示)一个目录
     * @param {string} dir 
     */
    openDir(dir) {
        dir = this.getAbsolutePath(dir);

        if (!fs.existsSync(dir)) {
            Editor.log("目录不存在：" + dir);
            return;
        }
        Electron.shell.showItemInFolder(dir);
        Electron.shell.beep();
    },
    /**
     * 选择一个目录
     * @param {string} title 
     * @param {string} defaultPath 
     */
    selectDir(title, defaultPath) {
        if (!title || typeof title != "string") {
            title = "选择一个文件夹";
        }
        if (!defaultPath) {
            defaultPath = Editor.Project.path; //默认打开项目目录
        }
        let res = Editor.Dialog.openFile({
            title: title,
            defaultPath: defaultPath,
            properties: ['openDirectory'],
        });
        if (res !== -1) {
            return res[0];
        }
        return "";

    },
    /**
     * 选择一个文件
     * @param {string} title 
     * @param {string} defaultPath 
     */
    selectFile(title, defaultPath) {
        if (!title || typeof title != "string") {
            title = "选择一个文件";
        }
        if (!defaultPath) {
            defaultPath = Editor.Project.path; //默认打开项目目录
        }
        let res = Editor.Dialog.openFile({
            title: title,
            defaultPath: defaultPath,
            properties: ['openFile'],
        });
        if (res !== -1) {
            Editor.log(res)
            return res[0];
        }
        return "";
    },
    /**
     * 绝对路径转项目相对路径
     */
    getRelativePath(url) {
        if (typeof url != "string") {
            return "";
        }
        let root = Editor.Project.path;
        let pathArr = url.split(root);
        if (pathArr.length == 2) {
            return pathArr[1];
        }
        return pathArr[0];
    },
    /**
     * 获取绝对路径
     */
    getAbsolutePath(url) {
        if (this.isAbsolutePath(url)) {
            return url;
        }
        let aPath = path.join(Editor.Project.path, url);
        return aPath;
    },
    isAbsolutePath(url) {
        return url.indexOf(Editor.Project.path) == 0;
    }


}