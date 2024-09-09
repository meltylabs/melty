#!/usr/bin/env bash
# shellcheck disable=SC1091

# NOTE needs to be run from parent of melty source directory
# takes Melty.app out of VSCode-darwin-arm64, signs it, and creates
# dmg and zip in assets/. The outputs are labeled by release version.

# May fail on second attempt with "already exists at key path NSAppleEventsUsageDescription"
# (which is an issue with sign.js)

set -e

usage() {
	echo "Usage: $0 -v <version> or $0 --release-version <version>"
	exit 1
}

RELEASE_VERSION=""
VERSION_PROVIDED=false

while [[ $# -gt 0 ]]; do
	case $1 in
	-v)
		RELEASE_VERSION="$2"
		VERSION_PROVIDED=true
		shift 2
		;;
	--release-version)
		RELEASE_VERSION="$2"
		VERSION_PROVIDED=true
		shift 2
		;;
	*)
		usage
		;;
	esac
done

# Check if version was provided
if [ "$VERSION_PROVIDED" = false ]; then
	echo "Error: Release version must be provided."
	usage
fi

APP_NAME="Melty"

APP_NAME_LC="$(echo "${APP_NAME}" | awk '{print tolower($0)}')"

CI_BUILD="no"

VSCODE_ARCH="arm64"
VSCODE_PLATFORM="darwin"

. macos-codesign.env

npm install -g checksum

sum_file() {
	if [[ -f "${1}" ]]; then
		echo "Calculating checksum for ${1}"
		checksum -a sha256 "${1}" >"${1}".sha256
		checksum "${1}" >"${1}".sha1
	fi
}

mkdir -p assets

if [[ -n "${CERTIFICATE_OSX_P12_DATA}" ]]; then
	if [[ "${CI_BUILD}" == "no" ]]; then
		RUNNER_TEMP="${TMPDIR}"
	fi

	# start melty addition
	pushd "melty/build"
	yarn install
	popd
	# end melty addition

	CERTIFICATE_P12="${APP_NAME}.p12"
	KEYCHAIN="${RUNNER_TEMP}/buildagent.keychain"
	AGENT_TEMPDIRECTORY="${RUNNER_TEMP}"
	# shellcheck disable=SC2006
	KEYCHAINS=$(security list-keychains | xargs)

	rm -f "${KEYCHAIN}"

	echo "${CERTIFICATE_OSX_P12_DATA}" | base64 --decode >"${CERTIFICATE_P12}"

	echo "+ create temporary keychain"
	security create-keychain -p pwd "${KEYCHAIN}"
	security set-keychain-settings -lut 21600 "${KEYCHAIN}"
	security unlock-keychain -p pwd "${KEYCHAIN}"
	# shellcheck disable=SC2086
	security list-keychains -s $KEYCHAINS "${KEYCHAIN}"
	# security show-keychain-info "${KEYCHAIN}"

	echo "+ import certificate to keychain"
	security import "${CERTIFICATE_P12}" -k "${KEYCHAIN}" -P "${CERTIFICATE_OSX_P12_PASSWORD}" -T /usr/bin/codesign
	security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k pwd "${KEYCHAIN}" >/dev/null
	# security find-identity "${KEYCHAIN}"

	CODESIGN_IDENTITY="$(security find-identity -v -p codesigning "${KEYCHAIN}" | grep -oEi "([0-9A-F]{40})" | head -n 1)"

	echo "+ signing"
	export CODESIGN_IDENTITY AGENT_TEMPDIRECTORY VSCODE_ARCH

	DEBUG="electron-osx-sign*" node melty/build/darwin/sign.js "$(pwd)"
	# codesign --display --entitlements :- ""

	echo "+ notarize"

	pushd "VSCode-darwin-${VSCODE_ARCH}"
	ZIP_FILE="./${APP_NAME}-darwin-${VSCODE_ARCH}-${RELEASE_VERSION}.zip"

	zip -r -X -y "${ZIP_FILE}" ./*.app

	xcrun notarytool store-credentials "${APP_NAME}" --apple-id "${CERTIFICATE_OSX_ID}" --team-id "${CERTIFICATE_OSX_TEAM_ID}" --password "${CERTIFICATE_OSX_APP_PASSWORD}" --keychain "${KEYCHAIN}"
	# xcrun notarytool history --keychain-profile "${APP_NAME}" --keychain "${KEYCHAIN}"
	xcrun notarytool submit "${ZIP_FILE}" --keychain-profile "${APP_NAME}" --wait --keychain "${KEYCHAIN}"

	echo "+ attach staple"
	xcrun stapler staple ./*.app
	# spctl --assess -vv --type install ./*.app

	rm "${ZIP_FILE}"

	popd
fi

if [[ "${SHOULD_BUILD_ZIP}" != "no" ]]; then
	echo "Building and moving ZIP"
	pushd "VSCode-darwin-${VSCODE_ARCH}"
	zip -r -X -y "../assets/${APP_NAME}-darwin-${VSCODE_ARCH}-${RELEASE_VERSION}.zip" ./*.app
	popd
fi

if [[ "${SHOULD_BUILD_DMG}" != "no" ]]; then
	echo "Building and moving DMG"
	pushd "VSCode-darwin-${VSCODE_ARCH}"
	npx create-dmg ./*.app .
	mv ./*.dmg "../assets/${APP_NAME}.${VSCODE_ARCH}.${RELEASE_VERSION}.dmg"
	popd
fi

if [[ "${SHOULD_BUILD_SRC}" == "yes" ]]; then
	git archive --format tar.gz --output="./assets/${APP_NAME}-${RELEASE_VERSION}-src.tar.gz" HEAD
	git archive --format zip --output="./assets/${APP_NAME}-${RELEASE_VERSION}-src.zip" HEAD
fi

if [[ -n "${CERTIFICATE_OSX_P12_DATA}" ]]; then
	echo "+ clean ${KEYCHAIN}"
	security delete-keychain "${KEYCHAIN}"
	# shellcheck disable=SC2086
	security list-keychains -s $KEYCHAINS
fi

if [[ "${SHOULD_BUILD_REH}" != "no" ]]; then
	echo "Building and moving REH"
	cd "vscode-reh-${VSCODE_PLATFORM}-${VSCODE_ARCH}"
	tar czf "../assets/${APP_NAME_LC}-reh-${VSCODE_PLATFORM}-${VSCODE_ARCH}-${RELEASE_VERSION}.tar.gz" .
	cd ..
fi

echo "+ checksums"

cd assets

for FILE in *; do
	if [[ -f "${FILE}" ]]; then
		sum_file "${FILE}"
	fi
done

cd ..

echo "+ done"
