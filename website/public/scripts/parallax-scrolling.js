/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/modules/parallax-scrolling.ts":
/*!*******************************************!*\
  !*** ./src/modules/parallax-scrolling.ts ***!
  \*******************************************/
/***/ (() => {

eval("\nconst parallaxElements = [];\nfunction isReplacedElement(e) {\n    return e instanceof HTMLIFrameElement\n        || e instanceof HTMLVideoElement\n        || e instanceof HTMLEmbedElement\n        || e instanceof HTMLImageElement;\n}\n// initial search for parallax elements\ndocument.querySelectorAll(\"*[parallax-factor]\").forEach(e => {\n    if (e instanceof HTMLElement) {\n        const factor = Number.parseFloat(e.getAttribute(\"parallax-factor\"));\n        if (!isNaN(factor)) {\n            const computedStyle = window.getComputedStyle(e);\n            if (isReplacedElement(e)) { // use original object-position value\n                const objPos = computedStyle.objectPosition.split(' ');\n                parallaxElements.push([e, factor, true, [objPos[0] ?? \"0px\", objPos[1] ?? \"0px\"]]);\n            }\n            else { // use original translate value\n                const translate = computedStyle.translate.split(' ');\n                parallaxElements.push([e, factor, true, [translate[0] ?? \"0px\", translate[1] ?? \"0px\"]]);\n            }\n        }\n    }\n});\ndocument.addEventListener(\"scroll\", () => {\n    parallaxElements.forEach(e => {\n        const offset = window.scrollY * (e[1] - 1);\n        console.log(e[3]);\n        if (e[2])\n            e[0].style.objectPosition = `${e[3][0]} calc(${e[3][1]} + ${offset}px)`;\n        else\n            e[0].style.translate = `${e[3][0]} calc(${e[3][1]} + ${offset}px)`;\n    });\n});\n\n\n//# sourceURL=webpack://gws-website/./src/modules/parallax-scrolling.ts?");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module can't be inlined because the eval devtool is used.
/******/ 	var __webpack_exports__ = {};
/******/ 	__webpack_modules__["./src/modules/parallax-scrolling.ts"]();
/******/ 	
/******/ })()
;