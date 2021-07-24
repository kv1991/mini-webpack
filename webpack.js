const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const babel = require('@babel/core');

function getModuleInfo(file) {
  const fileBody = fs.readFileSync(file, 'utf-8');

  const ast = parser.parse(fileBody, {
    sourceType: 'module'
  });

  // console.log('ast: ', ast);

  const deps = {};
  traverse(ast, {
    ImportDeclaration({ node }) {
      const dirname = path.dirname(file);
      const absPath = './' + path.join(dirname, node.source.value);
      deps[node.source.value] = absPath;
    }
  });

  const { code } = babel.transformFromAst(ast, null, {
    presets: ["@babel/preset-env"]
  });

  const moduleInfo = {
    file,
    deps,
    code
  }

  // console.log('deps: ', deps);
  return moduleInfo;
}

// const moduleInfo = getModuleInfo('./src/index.js');
// console.log('moduleInfo: ', moduleInfo);

function parseModules(file) {
  const entry = getModuleInfo(file);
  const depsGraph = {};
  const tempModules = [entry];
  getDeps(tempModules, entry);
  tempModules.forEach(info => {
    depsGraph[info.file] = {
      deps: info.deps,
      code: info.code
    }
  })
  return depsGraph;
}

function getDeps(tempModules, { deps }) {
  // console.log('deps: ', deps);
  // console.log('tempModules: ', tempModules);
  Object.keys(deps).forEach(dep => {
    // console.log('dep: ', deps[dep]);
    const nextModule = getModuleInfo(deps[dep]);
    // console.log('nextModule: ', nextModule);
    tempModules.push(nextModule);
    getDeps(tempModules, nextModule);
  })
}

function bundle(entry) {
  const file = JSON.stringify(parseModules(entry));
  return `(function (fileMap) {
    function require(file) {
      function absRequire(relPath) {
        return require(fileMap[file].deps[relPath])
      }
      let exports = {};
      (function (require, exports, code) {
        eval(code)
      })(absRequire, exports, fileMap[file].code)
      return exports;
    }
    require('${entry}');
  })(${file})`
}

const content = bundle('./src/index.js');
// console.log('content: ', content);

!fs.existsSync('./dist') && fs.mkdirSync('./dist');
fs.writeFileSync('./dist/bundle.js', content);