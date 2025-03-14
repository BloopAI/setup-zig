const path = require('path')
const get = require('simple-get').concat
const semver = require('semver')

function extForPlatform (platform) {
  return {
    linux: 'tar.xz',
    darwin: 'tar.xz',
    win32: 'zip'
  }[platform]
}

function resolveCommit (arch, platform, version) {
  const ext = extForPlatform(platform)
  const resolvedOs = {
    linux: 'linux',
    darwin: 'macos',
    win32: 'windows'
  }[platform]

  const resolvedArch = {
    arm: 'armv7a',
    arm64: 'aarch64',
    ppc64: 'powerpc64',
    riscv64: 'riscv64',
    x64: 'x86_64'
  }[arch]

  const downloadUrl = `https://ziglang.org/builds/zig-${resolvedOs}-${resolvedArch}-${version}.${ext}`
  const variantName = `zig-${resolvedOs}-${resolvedArch}-${version}`

  return { downloadUrl, variantName, version }
}

function getJSON (opts) {
  return new Promise((resolve, reject) => {
    get({ ...opts, json: true }, (err, req, data) => {
      if (err) {
        reject(err)
      } else {
        resolve(data)
      }
    })
  })
}

async function resolveVersion (arch, platform, version) {
  const ext = extForPlatform(platform)
  const resolvedOs = {
    linux: 'linux',
    darwin: 'macos',
    win32: 'windows'
  }[platform]

  const resolvedArch = {
    arm: 'armv7a',
    arm64: 'aarch64',
    ppc64: 'powerpc64',
    riscv64: 'riscv64',
    x64: 'x86_64'
  }[arch]

  const host = `${resolvedArch}-${resolvedOs}`

  const index = await getJSON({ url: 'https://ziglang.org/download/index.json' })

  const availableVersions = Object.keys(index)

  let resolvedVersion = version
  if (version === 'latest') {
    // Find latest stable release (non-master/non-dev versions with valid semver)
    const stableVersions = availableVersions
      .filter(v => v !== 'master' && v !== 'dev' && semver.valid(v))
      .sort(semver.compare)

    resolvedVersion = stableVersions[stableVersions.length - 1]
  }

  const useVersion = semver.valid(resolvedVersion)
    ? semver.maxSatisfying(availableVersions.filter((v) => semver.valid(v)), resolvedVersion)
    : null

  const meta = index[useVersion || resolvedVersion]
  if (!meta || !meta[host]) {
    throw new Error(`Could not find version ${useVersion || resolvedVersion} for platform ${host}`)
  }

  const downloadUrl = meta[host].tarball
  const variantName = path.basename(meta[host].tarball).replace(`.${ext}`, '')

  return { downloadUrl, variantName, version: useVersion || resolvedVersion }
}

module.exports = {
  extForPlatform,
  resolveCommit,
  resolveVersion
}
