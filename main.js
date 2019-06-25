'use strict';
function onBuildFinish(options, callback) {

  Editor.success("子包工具[subpackage-tools]::获取项目自动图集[AutoAtlas]相关信息. 如果不需要或对当前项目有所影响,请卸载此插件");

  buildResults = options.buildResults;


  let uuids = buildResults.getAssetUuids();
  for (let i = 0; i < uuids.length; i++) {
    let uuid = uuids[i];
    var url = Editor.assetdb.uuidToFspath(uuid);   // 获取不到资源路径的为 自动图集
    if (!url) {
      let nativeUrl = buildResults.getNativeAssetPath(uuid);
      var depends = _getDependParentUuids(uuid, buildResults);    // 精灵帧集合

      let getResourcesDir = /.*resources\/([a-zA-Z0-9-_]+\/)+/g;  /** 目录仅支持数字字母英文横线下划线 */
      let rootDir = "";
      for (let j = 0; j < depends.length; j++) {
        var url = Editor.assetdb.uuidToFspath(depends[j]);
        let dir = url.match(getResourcesDir)[0];
        if (!rootDir || rootDir.length >= dir.length) { // 目录最短的为自动图集的根目录
          rootDir = dir;
        }
      }
      Editor.log(`自动图集 ${nativeUrl} 所在目录 ${rootDir}`);
      // 缓存起来等待分离
      autoAtlas[uuid] = {
        nativeUrl: nativeUrl,       // 编译后的路径
        rootDir: rootDir,           // 自动图集所在路径
        containsSubAssets: depends  // 图集包含的子图uuids
      }
    }
  }

  Editor.log("项目的自动图集信息:: \n", autoAtlas);

  // Editor.success("正在生成子包...");
  // 开始生成子包

  // 当子包工具未打开时 会请求超时
  Editor.Ipc.sendToPanel("subpackage-tools", '_generateSubpack', (err, p) => {
    if (err) {
      // Editor.error(err);
    }
    callback();
  });

}

function _getTextureFromSpriteFrames(buildResults, assetInfos) {
  let textures = {};
  for (let i = 0; i < assetInfos.length; ++i) {
    let info = assetInfos[i];
    if (buildResults.containsAsset(info.uuid)) {
      let depends = buildResults.getDependencies(info.uuid);
      if (depends.length > 0) {
        // sprite frame should have only one texture
        textures[depends[0]] = true;
      }
    }
  }
  return Object.keys(textures);
}
/**
 * 获得资源被引用对象uuid集合
 * @date 2019-06-09
 * @param {*} uuid
 * @param {*} buildResults
 * @returns
 */
function _getDependParentUuids(uuid, buildResults) {
  let _buildAssets = buildResults._buildAssets;
  let parents = Object.create(null);
  for (const key in _buildAssets) {
    if (_buildAssets.hasOwnProperty(key)) {
      let obj = _buildAssets[key];
      if (typeof obj == "object" && Array.isArray(obj.dependUuids)) {
        for (let i = 0; i < obj.dependUuids.length; i++) {
          if (obj.dependUuids[i] == uuid) {
            parents[key] = true;
          }
        }
      }
    }
  }
  return Object.keys(parents);
}

let autoAtlas = Object.create(null);
let buildResults = undefined;

module.exports = {
  load() {
    // Editor.log("加载成功, 项目编译时请始终保持此插件同时打开");
    Editor.Builder.on('build-finished', onBuildFinish);
  },

  unload() {
    Editor.Builder.removeListener('build-finished', onBuildFinish);
  },


  // register your ipc messages here
  messages: {
    'open'() {
      Editor.log("[subpackage-tools] 将定制项目构建流程:构建结束时将根据配置分离出子包资源,如果不需要此功能请在项目构建前关闭插件");
      Editor.log("[subpackage-tools] 如果没有配置任何子包,将生成一个完整热更新主包");
      Editor.log("[subpackage-tools] 主包的 manifest 文件将自动导入到项目 assets 根目录下");
      Editor.Panel.open('subpackage-tools');
    },

    'close'() {
      Editor.Panel.close('subpackage-tools');
    },

    'getAutoAtlas'(event, ...args) {
      if (typeof event.reply == "function") {
        Editor.log("编译结果::", buildResults);
        if (!buildResults) {
          event.reply("构建结果为空,请先构建项目");
        }
        else {
          event.reply(null, { autoAtlas: autoAtlas, buildResults: buildResults });
        }
      }

    },
    "getBuildResults"(event, ...args) {
      if (typeof event.reply == "function") {
        event.reply(null, buildResults);
      }
    },
    "getProjectPath"(event, ...args) {
      if (typeof event.reply == "function") {
        event.reply(null, Editor.projectPath);
      }
    },


    'clicked'() {
      Editor.log('Button clicked!');
    },


  },
};