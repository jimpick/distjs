#!/usr/bin/env node
let fs = require('fs')
let path = require('path')
let minify = require('babel-minify')
let browserify = require('browserify')
let rimraf = require('rimraf')
let mkdirp = require('mkdirp')
let bl = require('bl')
let distfile = fs.readFileSync(path.join(__dirname, 'dist.js'))

const _browserify = _path => {
  return new Promise((resolve, reject) => {
    let b = browserify({debug: true})
    b.add(_path)
    b.bundle().pipe(bl((err, buffer) => {
      if (err) return reject(err)
      resolve(buffer)
    }))
  })
}

const mkdistfile = cwd => {
  console.log('Creating dist.js file...')
  fs.writeFileSync(path.join(cwd, 'dist.js'), distfile)
}

exports.build = async (cwd, name) => {
  const shortName = path.basename(name)
  mkdistfile(cwd)
  console.log('Creating dist directory...')
  mkdirp.sync(path.join(cwd, 'dist'))
  console.log('Creating browserify bundle...')
  let bundle = await _browserify(path.join(cwd, 'dist.js'))
  console.log(`Bundle size: ${bundle.length}`)
  console.log('Writing browserify bundle to dist/...')
  fs.writeFileSync(path.join(cwd, 'dist', `${shortName}.js`), bundle)
  console.log('Creating minified bundle...')
  let { code } = await minify(bundle)
  console.log(`Minified size: ${code.length}`)
  fs.writeFileSync(path.join(cwd, 'dist', `${shortName}.min.js`), code)
  console.log('Cleaning tmp dist.js file.')
  rimraf.sync(path.join(cwd, 'dist.js'))
}

const keys = Object.keys

const install = cwd => {
  let pkg = require(`${cwd}/package.json`)
  if (!pkg.scripts) pkg.scripts = {}
  pkg.scripts.prepublishOnly = 'distjs'
  let deps = []
  if (pkg.dependencies) deps = deps.concat(keys(pkg.dependencies))
  if (pkg.devDependencies) deps = deps.concat(keys(pkg.devDependencies))
  if (deps.includes('standard')) {
    if (!pkg.standard) pkg.standard = {}
    if (!pkg.standard.ignore) pkg.standard.ignore = []
    if (!pkg.standard.ignore.includes('dist')) {
      pkg.standard.ignore.push('dist')
    }
  }
  fs.writeFileSync(`${cwd}/package.json`, JSON.stringify(pkg, null, 2))
}

if (process.argv.length === 2) {
  let cwd = process.cwd()
  const {name, version} = require(`${cwd}/package.json`)
  exports.build(cwd, `${name}-${version}`)
} else if (process.argv.length === 3) {
  let cwd = process.cwd()
  let command = process.argv[2]
  if (command === 'distfile') {
    mkdistfile(cwd)
  } else if (command === 'install') {
    install(cwd)
  } else {
    throw new Error('unknown command')
  }
} else {
  throw new Error('unknown command')
}
