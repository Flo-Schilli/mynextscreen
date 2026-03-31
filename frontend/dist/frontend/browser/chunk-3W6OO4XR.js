import {
  BehaviorSubject,
  Injectable,
  setClassMetadata,
  ɵɵdefineInjectable
} from "./chunk-F2IK7UH5.js";

// node_modules/@teamhanko/hanko-elements/dist/elements.js
var e = { 7(e3, t2, n2) {
  !(function(e4, t3, n3) {
    function o2(e5, t4) {
      return [e5, !e5 || e5.endsWith("/") ? "" : "/", t4, ".json"].join("");
    }
    function a2(e5, t4) {
      let n4 = e5;
      return t4 && Object.keys(t4).forEach((e6) => {
        const o3 = t4[e6], a3 = new RegExp(`{${e6}}`, "gm");
        n4 = n4.replace(a3, o3.toString());
      }), n4;
    }
    function r2(e5, t4, n4) {
      let o3 = e5[t4];
      if (!o3) return n4;
      const a3 = n4.split(".");
      let r3 = "";
      do {
        r3 += a3.shift();
        const e6 = o3[r3];
        void 0 === e6 || "object" != typeof e6 && a3.length ? a3.length ? r3 += "." : o3 = n4 : (o3 = e6, r3 = "");
      } while (a3.length);
      return o3;
    }
    var i2 = Object.defineProperty, s2 = Object.getOwnPropertySymbols, c2 = Object.prototype.hasOwnProperty, l2 = Object.prototype.propertyIsEnumerable, d2 = (e5, t4, n4) => t4 in e5 ? i2(e5, t4, { enumerable: true, configurable: true, writable: true, value: n4 }) : e5[t4] = n4, u2 = (e5, t4, n4) => new Promise((o3, a3) => {
      var r3 = (e6) => {
        try {
          s3(n4.next(e6));
        } catch (e7) {
          a3(e7);
        }
      }, i3 = (e6) => {
        try {
          s3(n4.throw(e6));
        } catch (e7) {
          a3(e7);
        }
      }, s3 = (e6) => e6.done ? o3(e6.value) : Promise.resolve(e6.value).then(r3, i3);
      s3((n4 = n4.apply(e5, t4)).next());
    });
    let h2 = {};
    const p2 = { root: "", lang: "en", fallbackLang: "en" };
    function f2(e5, t4) {
      e5 = Object.assign({}, p2, e5), h2 = t4 || h2;
      const [i3, f3] = n3.useState(e5.lang), [_3, v2] = n3.useState(h2), [m2, g2] = n3.useState(false), y2 = n3.useCallback((t5) => u2(null, null, function* () {
        if (!_3[t5]) {
          g2(false);
          try {
            const n4 = o2(e5.root, t5), a3 = yield fetch(n4);
            h2[t5] = yield a3.json();
          } catch (e6) {
            console.error(`Failed to load language data for ${t5}:`, e6);
          } finally {
            v2(((e6, t6) => {
              for (var n4 in t6 || (t6 = {})) c2.call(t6, n4) && d2(e6, n4, t6[n4]);
              if (s2) for (var n4 of s2(t6)) l2.call(t6, n4) && d2(e6, n4, t6[n4]);
              return e6;
            })({}, h2)), g2(true);
          }
        }
      }), [_3, e5.root]);
      n3.useEffect(() => {
        u2(null, null, function* () {
          yield y2(e5.fallbackLang), yield y2(i3);
        });
      }, [i3, y2, e5.fallbackLang]);
      const b2 = n3.useMemo(() => (t5, n4) => {
        if (!Object.prototype.hasOwnProperty.call(_3, i3)) return t5;
        let o3 = r2(_3, i3, t5);
        return o3 === t5 && i3 !== e5.fallbackLang && (o3 = r2(_3, e5.fallbackLang, t5)), a2(o3, n4);
      }, [_3, i3, e5.fallbackLang]);
      return { lang: i3, setLang: f3, t: b2, isReady: m2 };
    }
    const _2 = t3.createContext(null);
    e4.TranslateContext = _2, e4.TranslateProvider = (e5) => {
      const { t: n4, setLang: o3, lang: a3, isReady: r3 } = f2({ root: e5.root || "assets", lang: e5.lang || "en", fallbackLang: e5.fallbackLang || "en" }, e5.translations);
      return t3.h(_2.Provider, { value: { t: n4, setLang: o3, lang: a3, isReady: r3 } }, e5.children);
    }, e4.format = a2, e4.getResourceUrl = o2, e4.getValue = r2, Object.defineProperty(e4, "__esModule", { value: true });
  })(t2, n2(616), n2(78));
}, 616(e3, t2, n2) {
  n2.r(t2), n2.d(t2, { Component: () => A2, Fragment: () => C2, cloneElement: () => J2, createContext: () => Q2, createElement: () => w2, createRef: () => x2, h: () => w2, hydrate: () => $2, isValidElement: () => i2, options: () => a2, render: () => V2, toChildArray: () => L2 });
  var o2, a2, r2, i2, s2, c2, l2, d2, u2, h2, p2, f2, _2, v2 = {}, m2 = [], g2 = /acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i, y2 = Array.isArray;
  function b2(e4, t3) {
    for (var n3 in t3) e4[n3] = t3[n3];
    return e4;
  }
  function k2(e4) {
    e4 && e4.parentNode && e4.parentNode.removeChild(e4);
  }
  function w2(e4, t3, n3) {
    var a3, r3, i3, s3 = {};
    for (i3 in t3) "key" == i3 ? a3 = t3[i3] : "ref" == i3 ? r3 = t3[i3] : s3[i3] = t3[i3];
    if (arguments.length > 2 && (s3.children = arguments.length > 3 ? o2.call(arguments, 2) : n3), "function" == typeof e4 && null != e4.defaultProps) for (i3 in e4.defaultProps) void 0 === s3[i3] && (s3[i3] = e4.defaultProps[i3]);
    return S2(e4, s3, a3, r3, null);
  }
  function S2(e4, t3, n3, o3, i3) {
    var s3 = { type: e4, props: t3, key: n3, ref: o3, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: null == i3 ? ++r2 : i3, __i: -1, __u: 0 };
    return null == i3 && null != a2.vnode && a2.vnode(s3), s3;
  }
  function x2() {
    return { current: null };
  }
  function C2(e4) {
    return e4.children;
  }
  function A2(e4, t3) {
    this.props = e4, this.context = t3;
  }
  function I2(e4, t3) {
    if (null == t3) return e4.__ ? I2(e4.__, e4.__i + 1) : null;
    for (var n3; t3 < e4.__k.length; t3++) if (null != (n3 = e4.__k[t3]) && null != n3.__e) return n3.__e;
    return "function" == typeof e4.type ? I2(e4) : null;
  }
  function E2(e4) {
    var t3, n3;
    if (null != (e4 = e4.__) && null != e4.__c) {
      for (e4.__e = e4.__c.base = null, t3 = 0; t3 < e4.__k.length; t3++) if (null != (n3 = e4.__k[t3]) && null != n3.__e) {
        e4.__e = e4.__c.base = n3.__e;
        break;
      }
      return E2(e4);
    }
  }
  function P2(e4) {
    (!e4.__d && (e4.__d = true) && s2.push(e4) && !O2.__r++ || c2 != a2.debounceRendering) && ((c2 = a2.debounceRendering) || l2)(O2);
  }
  function O2() {
    for (var e4, t3, n3, o3, r3, i3, c3, l3 = 1; s2.length; ) s2.length > l3 && s2.sort(d2), e4 = s2.shift(), l3 = s2.length, e4.__d && (n3 = void 0, o3 = void 0, r3 = (o3 = (t3 = e4).__v).__e, i3 = [], c3 = [], t3.__P && ((n3 = b2({}, o3)).__v = o3.__v + 1, a2.vnode && a2.vnode(n3), W2(t3.__P, n3, o3, t3.__n, t3.__P.namespaceURI, 32 & o3.__u ? [r3] : null, i3, null == r3 ? I2(o3) : r3, !!(32 & o3.__u), c3), n3.__v = o3.__v, n3.__.__k[n3.__i] = n3, R2(i3, n3, c3), o3.__e = o3.__ = null, n3.__e != r3 && E2(n3)));
    O2.__r = 0;
  }
  function D2(e4, t3, n3, o3, a3, r3, i3, s3, c3, l3, d3) {
    var u3, h3, p3, f3, _3, g3, y3, b3 = o3 && o3.__k || m2, k3 = t3.length;
    for (c3 = T2(n3, t3, b3, c3, k3), u3 = 0; u3 < k3; u3++) null != (p3 = n3.__k[u3]) && (h3 = -1 == p3.__i ? v2 : b3[p3.__i] || v2, p3.__i = u3, g3 = W2(e4, p3, h3, a3, r3, i3, s3, c3, l3, d3), f3 = p3.__e, p3.ref && h3.ref != p3.ref && (h3.ref && K2(h3.ref, null, p3), d3.push(p3.ref, p3.__c || f3, p3)), null == _3 && null != f3 && (_3 = f3), (y3 = !!(4 & p3.__u)) || h3.__k === p3.__k ? c3 = N2(p3, c3, e4, y3) : "function" == typeof p3.type && void 0 !== g3 ? c3 = g3 : f3 && (c3 = f3.nextSibling), p3.__u &= -7);
    return n3.__e = _3, c3;
  }
  function T2(e4, t3, n3, o3, a3) {
    var r3, i3, s3, c3, l3, d3 = n3.length, u3 = d3, h3 = 0;
    for (e4.__k = new Array(a3), r3 = 0; r3 < a3; r3++) null != (i3 = t3[r3]) && "boolean" != typeof i3 && "function" != typeof i3 ? ("string" == typeof i3 || "number" == typeof i3 || "bigint" == typeof i3 || i3.constructor == String ? i3 = e4.__k[r3] = S2(null, i3, null, null, null) : y2(i3) ? i3 = e4.__k[r3] = S2(C2, { children: i3 }, null, null, null) : void 0 === i3.constructor && i3.__b > 0 ? i3 = e4.__k[r3] = S2(i3.type, i3.props, i3.key, i3.ref ? i3.ref : null, i3.__v) : e4.__k[r3] = i3, c3 = r3 + h3, i3.__ = e4, i3.__b = e4.__b + 1, s3 = null, -1 != (l3 = i3.__i = j2(i3, n3, c3, u3)) && (u3--, (s3 = n3[l3]) && (s3.__u |= 2)), null == s3 || null == s3.__v ? (-1 == l3 && (a3 > d3 ? h3-- : a3 < d3 && h3++), "function" != typeof i3.type && (i3.__u |= 4)) : l3 != c3 && (l3 == c3 - 1 ? h3-- : l3 == c3 + 1 ? h3++ : (l3 > c3 ? h3-- : h3++, i3.__u |= 4))) : e4.__k[r3] = null;
    if (u3) for (r3 = 0; r3 < d3; r3++) null != (s3 = n3[r3]) && !(2 & s3.__u) && (s3.__e == o3 && (o3 = I2(s3)), B2(s3, s3));
    return o3;
  }
  function N2(e4, t3, n3, o3) {
    var a3, r3;
    if ("function" == typeof e4.type) {
      for (a3 = e4.__k, r3 = 0; a3 && r3 < a3.length; r3++) a3[r3] && (a3[r3].__ = e4, t3 = N2(a3[r3], t3, n3, o3));
      return t3;
    }
    e4.__e != t3 && (o3 && (t3 && e4.type && !t3.parentNode && (t3 = I2(e4)), n3.insertBefore(e4.__e, t3 || null)), t3 = e4.__e);
    do {
      t3 = t3 && t3.nextSibling;
    } while (null != t3 && 8 == t3.nodeType);
    return t3;
  }
  function L2(e4, t3) {
    return t3 = t3 || [], null == e4 || "boolean" == typeof e4 || (y2(e4) ? e4.some(function(e5) {
      L2(e5, t3);
    }) : t3.push(e4)), t3;
  }
  function j2(e4, t3, n3, o3) {
    var a3, r3, i3, s3 = e4.key, c3 = e4.type, l3 = t3[n3], d3 = null != l3 && !(2 & l3.__u);
    if (null === l3 && null == s3 || d3 && s3 == l3.key && c3 == l3.type) return n3;
    if (o3 > (d3 ? 1 : 0)) {
      for (a3 = n3 - 1, r3 = n3 + 1; a3 >= 0 || r3 < t3.length; ) if (null != (l3 = t3[i3 = a3 >= 0 ? a3-- : r3++]) && !(2 & l3.__u) && s3 == l3.key && c3 == l3.type) return i3;
    }
    return -1;
  }
  function M2(e4, t3, n3) {
    "-" == t3[0] ? e4.setProperty(t3, null == n3 ? "" : n3) : e4[t3] = null == n3 ? "" : "number" != typeof n3 || g2.test(t3) ? n3 : n3 + "px";
  }
  function U2(e4, t3, n3, o3, a3) {
    var r3, i3;
    e: if ("style" == t3) if ("string" == typeof n3) e4.style.cssText = n3;
    else {
      if ("string" == typeof o3 && (e4.style.cssText = o3 = ""), o3) for (t3 in o3) n3 && t3 in n3 || M2(e4.style, t3, "");
      if (n3) for (t3 in n3) o3 && n3[t3] == o3[t3] || M2(e4.style, t3, n3[t3]);
    }
    else if ("o" == t3[0] && "n" == t3[1]) r3 = t3 != (t3 = t3.replace(u2, "$1")), i3 = t3.toLowerCase(), t3 = i3 in e4 || "onFocusOut" == t3 || "onFocusIn" == t3 ? i3.slice(2) : t3.slice(2), e4.l || (e4.l = {}), e4.l[t3 + r3] = n3, n3 ? o3 ? n3.u = o3.u : (n3.u = h2, e4.addEventListener(t3, r3 ? f2 : p2, r3)) : e4.removeEventListener(t3, r3 ? f2 : p2, r3);
    else {
      if ("http://www.w3.org/2000/svg" == a3) t3 = t3.replace(/xlink(H|:h)/, "h").replace(/sName$/, "s");
      else if ("width" != t3 && "height" != t3 && "href" != t3 && "list" != t3 && "form" != t3 && "tabIndex" != t3 && "download" != t3 && "rowSpan" != t3 && "colSpan" != t3 && "role" != t3 && "popover" != t3 && t3 in e4) try {
        e4[t3] = null == n3 ? "" : n3;
        break e;
      } catch (e5) {
      }
      "function" == typeof n3 || (null == n3 || false === n3 && "-" != t3[4] ? e4.removeAttribute(t3) : e4.setAttribute(t3, "popover" == t3 && 1 == n3 ? "" : n3));
    }
  }
  function F2(e4) {
    return function(t3) {
      if (this.l) {
        var n3 = this.l[t3.type + e4];
        if (null == t3.t) t3.t = h2++;
        else if (t3.t < n3.u) return;
        return n3(a2.event ? a2.event(t3) : t3);
      }
    };
  }
  function W2(e4, t3, n3, o3, r3, i3, s3, c3, l3, d3) {
    var u3, h3, p3, f3, _3, v3, m3, g3, w3, S3, x3, I3, E3, P3, O3, T3, N3, L3 = t3.type;
    if (void 0 !== t3.constructor) return null;
    128 & n3.__u && (l3 = !!(32 & n3.__u), i3 = [c3 = t3.__e = n3.__e]), (u3 = a2.__b) && u3(t3);
    e: if ("function" == typeof L3) try {
      if (g3 = t3.props, w3 = "prototype" in L3 && L3.prototype.render, S3 = (u3 = L3.contextType) && o3[u3.__c], x3 = u3 ? S3 ? S3.props.value : u3.__ : o3, n3.__c ? m3 = (h3 = t3.__c = n3.__c).__ = h3.__E : (w3 ? t3.__c = h3 = new L3(g3, x3) : (t3.__c = h3 = new A2(g3, x3), h3.constructor = L3, h3.render = Z2), S3 && S3.sub(h3), h3.state || (h3.state = {}), h3.__n = o3, p3 = h3.__d = true, h3.__h = [], h3._sb = []), w3 && null == h3.__s && (h3.__s = h3.state), w3 && null != L3.getDerivedStateFromProps && (h3.__s == h3.state && (h3.__s = b2({}, h3.__s)), b2(h3.__s, L3.getDerivedStateFromProps(g3, h3.__s))), f3 = h3.props, _3 = h3.state, h3.__v = t3, p3) w3 && null == L3.getDerivedStateFromProps && null != h3.componentWillMount && h3.componentWillMount(), w3 && null != h3.componentDidMount && h3.__h.push(h3.componentDidMount);
      else {
        if (w3 && null == L3.getDerivedStateFromProps && g3 !== f3 && null != h3.componentWillReceiveProps && h3.componentWillReceiveProps(g3, x3), t3.__v == n3.__v || !h3.__e && null != h3.shouldComponentUpdate && false === h3.shouldComponentUpdate(g3, h3.__s, x3)) {
          for (t3.__v != n3.__v && (h3.props = g3, h3.state = h3.__s, h3.__d = false), t3.__e = n3.__e, t3.__k = n3.__k, t3.__k.some(function(e5) {
            e5 && (e5.__ = t3);
          }), I3 = 0; I3 < h3._sb.length; I3++) h3.__h.push(h3._sb[I3]);
          h3._sb = [], h3.__h.length && s3.push(h3);
          break e;
        }
        null != h3.componentWillUpdate && h3.componentWillUpdate(g3, h3.__s, x3), w3 && null != h3.componentDidUpdate && h3.__h.push(function() {
          h3.componentDidUpdate(f3, _3, v3);
        });
      }
      if (h3.context = x3, h3.props = g3, h3.__P = e4, h3.__e = false, E3 = a2.__r, P3 = 0, w3) {
        for (h3.state = h3.__s, h3.__d = false, E3 && E3(t3), u3 = h3.render(h3.props, h3.state, h3.context), O3 = 0; O3 < h3._sb.length; O3++) h3.__h.push(h3._sb[O3]);
        h3._sb = [];
      } else do {
        h3.__d = false, E3 && E3(t3), u3 = h3.render(h3.props, h3.state, h3.context), h3.state = h3.__s;
      } while (h3.__d && ++P3 < 25);
      h3.state = h3.__s, null != h3.getChildContext && (o3 = b2(b2({}, o3), h3.getChildContext())), w3 && !p3 && null != h3.getSnapshotBeforeUpdate && (v3 = h3.getSnapshotBeforeUpdate(f3, _3)), T3 = u3, null != u3 && u3.type === C2 && null == u3.key && (T3 = q2(u3.props.children)), c3 = D2(e4, y2(T3) ? T3 : [T3], t3, n3, o3, r3, i3, s3, c3, l3, d3), h3.base = t3.__e, t3.__u &= -161, h3.__h.length && s3.push(h3), m3 && (h3.__E = h3.__ = null);
    } catch (e5) {
      if (t3.__v = null, l3 || null != i3) if (e5.then) {
        for (t3.__u |= l3 ? 160 : 128; c3 && 8 == c3.nodeType && c3.nextSibling; ) c3 = c3.nextSibling;
        i3[i3.indexOf(c3)] = null, t3.__e = c3;
      } else {
        for (N3 = i3.length; N3--; ) k2(i3[N3]);
        H2(t3);
      }
      else t3.__e = n3.__e, t3.__k = n3.__k, e5.then || H2(t3);
      a2.__e(e5, t3, n3);
    }
    else null == i3 && t3.__v == n3.__v ? (t3.__k = n3.__k, t3.__e = n3.__e) : c3 = t3.__e = z2(n3.__e, t3, n3, o3, r3, i3, s3, l3, d3);
    return (u3 = a2.diffed) && u3(t3), 128 & t3.__u ? void 0 : c3;
  }
  function H2(e4) {
    e4 && e4.__c && (e4.__c.__e = true), e4 && e4.__k && e4.__k.forEach(H2);
  }
  function R2(e4, t3, n3) {
    for (var o3 = 0; o3 < n3.length; o3++) K2(n3[o3], n3[++o3], n3[++o3]);
    a2.__c && a2.__c(t3, e4), e4.some(function(t4) {
      try {
        e4 = t4.__h, t4.__h = [], e4.some(function(e5) {
          e5.call(t4);
        });
      } catch (e5) {
        a2.__e(e5, t4.__v);
      }
    });
  }
  function q2(e4) {
    return "object" != typeof e4 || null == e4 || e4.__b && e4.__b > 0 ? e4 : y2(e4) ? e4.map(q2) : b2({}, e4);
  }
  function z2(e4, t3, n3, r3, i3, s3, c3, l3, d3) {
    var u3, h3, p3, f3, _3, m3, g3, b3 = n3.props || v2, w3 = t3.props, S3 = t3.type;
    if ("svg" == S3 ? i3 = "http://www.w3.org/2000/svg" : "math" == S3 ? i3 = "http://www.w3.org/1998/Math/MathML" : i3 || (i3 = "http://www.w3.org/1999/xhtml"), null != s3) {
      for (u3 = 0; u3 < s3.length; u3++) if ((_3 = s3[u3]) && "setAttribute" in _3 == !!S3 && (S3 ? _3.localName == S3 : 3 == _3.nodeType)) {
        e4 = _3, s3[u3] = null;
        break;
      }
    }
    if (null == e4) {
      if (null == S3) return document.createTextNode(w3);
      e4 = document.createElementNS(i3, S3, w3.is && w3), l3 && (a2.__m && a2.__m(t3, s3), l3 = false), s3 = null;
    }
    if (null == S3) b3 === w3 || l3 && e4.data == w3 || (e4.data = w3);
    else {
      if (s3 = s3 && o2.call(e4.childNodes), !l3 && null != s3) for (b3 = {}, u3 = 0; u3 < e4.attributes.length; u3++) b3[(_3 = e4.attributes[u3]).name] = _3.value;
      for (u3 in b3) if (_3 = b3[u3], "children" == u3) ;
      else if ("dangerouslySetInnerHTML" == u3) p3 = _3;
      else if (!(u3 in w3)) {
        if ("value" == u3 && "defaultValue" in w3 || "checked" == u3 && "defaultChecked" in w3) continue;
        U2(e4, u3, null, _3, i3);
      }
      for (u3 in w3) _3 = w3[u3], "children" == u3 ? f3 = _3 : "dangerouslySetInnerHTML" == u3 ? h3 = _3 : "value" == u3 ? m3 = _3 : "checked" == u3 ? g3 = _3 : l3 && "function" != typeof _3 || b3[u3] === _3 || U2(e4, u3, _3, b3[u3], i3);
      if (h3) l3 || p3 && (h3.__html == p3.__html || h3.__html == e4.innerHTML) || (e4.innerHTML = h3.__html), t3.__k = [];
      else if (p3 && (e4.innerHTML = ""), D2("template" == t3.type ? e4.content : e4, y2(f3) ? f3 : [f3], t3, n3, r3, "foreignObject" == S3 ? "http://www.w3.org/1999/xhtml" : i3, s3, c3, s3 ? s3[0] : n3.__k && I2(n3, 0), l3, d3), null != s3) for (u3 = s3.length; u3--; ) k2(s3[u3]);
      l3 || (u3 = "value", "progress" == S3 && null == m3 ? e4.removeAttribute("value") : null != m3 && (m3 !== e4[u3] || "progress" == S3 && !m3 || "option" == S3 && m3 != b3[u3]) && U2(e4, u3, m3, b3[u3], i3), u3 = "checked", null != g3 && g3 != e4[u3] && U2(e4, u3, g3, b3[u3], i3));
    }
    return e4;
  }
  function K2(e4, t3, n3) {
    try {
      if ("function" == typeof e4) {
        var o3 = "function" == typeof e4.__u;
        o3 && e4.__u(), o3 && null == t3 || (e4.__u = e4(t3));
      } else e4.current = t3;
    } catch (e5) {
      a2.__e(e5, n3);
    }
  }
  function B2(e4, t3, n3) {
    var o3, r3;
    if (a2.unmount && a2.unmount(e4), (o3 = e4.ref) && (o3.current && o3.current != e4.__e || K2(o3, null, t3)), null != (o3 = e4.__c)) {
      if (o3.componentWillUnmount) try {
        o3.componentWillUnmount();
      } catch (e5) {
        a2.__e(e5, t3);
      }
      o3.base = o3.__P = null;
    }
    if (o3 = e4.__k) for (r3 = 0; r3 < o3.length; r3++) o3[r3] && B2(o3[r3], t3, n3 || "function" != typeof e4.type);
    n3 || k2(e4.__e), e4.__c = e4.__ = e4.__e = void 0;
  }
  function Z2(e4, t3, n3) {
    return this.constructor(e4, n3);
  }
  function V2(e4, t3, n3) {
    var r3, i3, s3, c3;
    t3 == document && (t3 = document.documentElement), a2.__ && a2.__(e4, t3), i3 = (r3 = "function" == typeof n3) ? null : n3 && n3.__k || t3.__k, s3 = [], c3 = [], W2(t3, e4 = (!r3 && n3 || t3).__k = w2(C2, null, [e4]), i3 || v2, v2, t3.namespaceURI, !r3 && n3 ? [n3] : i3 ? null : t3.firstChild ? o2.call(t3.childNodes) : null, s3, !r3 && n3 ? n3 : i3 ? i3.__e : t3.firstChild, r3, c3), R2(s3, e4, c3);
  }
  function $2(e4, t3) {
    V2(e4, t3, $2);
  }
  function J2(e4, t3, n3) {
    var a3, r3, i3, s3, c3 = b2({}, e4.props);
    for (i3 in e4.type && e4.type.defaultProps && (s3 = e4.type.defaultProps), t3) "key" == i3 ? a3 = t3[i3] : "ref" == i3 ? r3 = t3[i3] : c3[i3] = void 0 === t3[i3] && null != s3 ? s3[i3] : t3[i3];
    return arguments.length > 2 && (c3.children = arguments.length > 3 ? o2.call(arguments, 2) : n3), S2(e4.type, c3, a3 || e4.key, r3 || e4.ref, null);
  }
  function Q2(e4) {
    function t3(e5) {
      var n3, o3;
      return this.getChildContext || (n3 = /* @__PURE__ */ new Set(), (o3 = {})[t3.__c] = this, this.getChildContext = function() {
        return o3;
      }, this.componentWillUnmount = function() {
        n3 = null;
      }, this.shouldComponentUpdate = function(e6) {
        this.props.value != e6.value && n3.forEach(function(e7) {
          e7.__e = true, P2(e7);
        });
      }, this.sub = function(e6) {
        n3.add(e6);
        var t4 = e6.componentWillUnmount;
        e6.componentWillUnmount = function() {
          n3 && n3.delete(e6), t4 && t4.call(e6);
        };
      }), e5.children;
    }
    return t3.__c = "__cC" + _2++, t3.__ = e4, t3.Provider = t3.__l = (t3.Consumer = function(e5, t4) {
      return e5.children(t4);
    }).contextType = t3, t3;
  }
  o2 = m2.slice, a2 = { __e: function(e4, t3, n3, o3) {
    for (var a3, r3, i3; t3 = t3.__; ) if ((a3 = t3.__c) && !a3.__) try {
      if ((r3 = a3.constructor) && null != r3.getDerivedStateFromError && (a3.setState(r3.getDerivedStateFromError(e4)), i3 = a3.__d), null != a3.componentDidCatch && (a3.componentDidCatch(e4, o3 || {}), i3 = a3.__d), i3) return a3.__E = a3;
    } catch (t4) {
      e4 = t4;
    }
    throw e4;
  } }, r2 = 0, i2 = function(e4) {
    return null != e4 && void 0 === e4.constructor;
  }, A2.prototype.setState = function(e4, t3) {
    var n3;
    n3 = null != this.__s && this.__s != this.state ? this.__s : this.__s = b2({}, this.state), "function" == typeof e4 && (e4 = e4(b2({}, n3), this.props)), e4 && b2(n3, e4), null != e4 && this.__v && (t3 && this._sb.push(t3), P2(this));
  }, A2.prototype.forceUpdate = function(e4) {
    this.__v && (this.__e = true, e4 && this.__h.push(e4), P2(this));
  }, A2.prototype.render = C2, s2 = [], l2 = "function" == typeof Promise ? Promise.prototype.then.bind(Promise.resolve()) : setTimeout, d2 = function(e4, t3) {
    return e4.__v.__b - t3.__v.__b;
  }, O2.__r = 0, u2 = /(PointerCapture)$|Capture$/i, h2 = 0, p2 = F2(false), f2 = F2(true), _2 = 0;
}, 78(e3, t2, n2) {
  n2.r(t2), n2.d(t2, { useCallback: () => C2, useContext: () => A2, useDebugValue: () => I2, useEffect: () => b2, useErrorBoundary: () => E2, useId: () => P2, useImperativeHandle: () => S2, useLayoutEffect: () => k2, useMemo: () => x2, useReducer: () => y2, useRef: () => w2, useState: () => g2 });
  var o2, a2, r2, i2, s2 = n2(616), c2 = 0, l2 = [], d2 = s2.options, u2 = d2.__b, h2 = d2.__r, p2 = d2.diffed, f2 = d2.__c, _2 = d2.unmount, v2 = d2.__;
  function m2(e4, t3) {
    d2.__h && d2.__h(a2, e4, c2 || t3), c2 = 0;
    var n3 = a2.__H || (a2.__H = { __: [], __h: [] });
    return e4 >= n3.__.length && n3.__.push({}), n3.__[e4];
  }
  function g2(e4) {
    return c2 = 1, y2(M2, e4);
  }
  function y2(e4, t3, n3) {
    var r3 = m2(o2++, 2);
    if (r3.t = e4, !r3.__c && (r3.__ = [n3 ? n3(t3) : M2(void 0, t3), function(e5) {
      var t4 = r3.__N ? r3.__N[0] : r3.__[0], n4 = r3.t(t4, e5);
      t4 !== n4 && (r3.__N = [n4, r3.__[1]], r3.__c.setState({}));
    }], r3.__c = a2, !a2.__f)) {
      var i3 = function(e5, t4, n4) {
        if (!r3.__c.__H) return true;
        var o3 = r3.__c.__H.__.filter(function(e6) {
          return !!e6.__c;
        });
        if (o3.every(function(e6) {
          return !e6.__N;
        })) return !s3 || s3.call(this, e5, t4, n4);
        var a3 = r3.__c.props !== e5;
        return o3.forEach(function(e6) {
          if (e6.__N) {
            var t5 = e6.__[0];
            e6.__ = e6.__N, e6.__N = void 0, t5 !== e6.__[0] && (a3 = true);
          }
        }), s3 && s3.call(this, e5, t4, n4) || a3;
      };
      a2.__f = true;
      var s3 = a2.shouldComponentUpdate, c3 = a2.componentWillUpdate;
      a2.componentWillUpdate = function(e5, t4, n4) {
        if (this.__e) {
          var o3 = s3;
          s3 = void 0, i3(e5, t4, n4), s3 = o3;
        }
        c3 && c3.call(this, e5, t4, n4);
      }, a2.shouldComponentUpdate = i3;
    }
    return r3.__N || r3.__;
  }
  function b2(e4, t3) {
    var n3 = m2(o2++, 3);
    !d2.__s && j2(n3.__H, t3) && (n3.__ = e4, n3.u = t3, a2.__H.__h.push(n3));
  }
  function k2(e4, t3) {
    var n3 = m2(o2++, 4);
    !d2.__s && j2(n3.__H, t3) && (n3.__ = e4, n3.u = t3, a2.__h.push(n3));
  }
  function w2(e4) {
    return c2 = 5, x2(function() {
      return { current: e4 };
    }, []);
  }
  function S2(e4, t3, n3) {
    c2 = 6, k2(function() {
      if ("function" == typeof e4) {
        var n4 = e4(t3());
        return function() {
          e4(null), n4 && "function" == typeof n4 && n4();
        };
      }
      if (e4) return e4.current = t3(), function() {
        return e4.current = null;
      };
    }, null == n3 ? n3 : n3.concat(e4));
  }
  function x2(e4, t3) {
    var n3 = m2(o2++, 7);
    return j2(n3.__H, t3) && (n3.__ = e4(), n3.__H = t3, n3.__h = e4), n3.__;
  }
  function C2(e4, t3) {
    return c2 = 8, x2(function() {
      return e4;
    }, t3);
  }
  function A2(e4) {
    var t3 = a2.context[e4.__c], n3 = m2(o2++, 9);
    return n3.c = e4, t3 ? (null == n3.__ && (n3.__ = true, t3.sub(a2)), t3.props.value) : e4.__;
  }
  function I2(e4, t3) {
    d2.useDebugValue && d2.useDebugValue(t3 ? t3(e4) : e4);
  }
  function E2(e4) {
    var t3 = m2(o2++, 10), n3 = g2();
    return t3.__ = e4, a2.componentDidCatch || (a2.componentDidCatch = function(e5, o3) {
      t3.__ && t3.__(e5, o3), n3[1](e5);
    }), [n3[0], function() {
      n3[1](void 0);
    }];
  }
  function P2() {
    var e4 = m2(o2++, 11);
    if (!e4.__) {
      for (var t3 = a2.__v; null !== t3 && !t3.__m && null !== t3.__; ) t3 = t3.__;
      var n3 = t3.__m || (t3.__m = [0, 0]);
      e4.__ = "P" + n3[0] + "-" + n3[1]++;
    }
    return e4.__;
  }
  function O2() {
    for (var e4; e4 = l2.shift(); ) if (e4.__P && e4.__H) try {
      e4.__H.__h.forEach(N2), e4.__H.__h.forEach(L2), e4.__H.__h = [];
    } catch (t3) {
      e4.__H.__h = [], d2.__e(t3, e4.__v);
    }
  }
  d2.__b = function(e4) {
    a2 = null, u2 && u2(e4);
  }, d2.__ = function(e4, t3) {
    e4 && t3.__k && t3.__k.__m && (e4.__m = t3.__k.__m), v2 && v2(e4, t3);
  }, d2.__r = function(e4) {
    h2 && h2(e4), o2 = 0;
    var t3 = (a2 = e4.__c).__H;
    t3 && (r2 === a2 ? (t3.__h = [], a2.__h = [], t3.__.forEach(function(e5) {
      e5.__N && (e5.__ = e5.__N), e5.u = e5.__N = void 0;
    })) : (t3.__h.forEach(N2), t3.__h.forEach(L2), t3.__h = [], o2 = 0)), r2 = a2;
  }, d2.diffed = function(e4) {
    p2 && p2(e4);
    var t3 = e4.__c;
    t3 && t3.__H && (t3.__H.__h.length && (1 !== l2.push(t3) && i2 === d2.requestAnimationFrame || ((i2 = d2.requestAnimationFrame) || T2)(O2)), t3.__H.__.forEach(function(e5) {
      e5.u && (e5.__H = e5.u), e5.u = void 0;
    })), r2 = a2 = null;
  }, d2.__c = function(e4, t3) {
    t3.some(function(e5) {
      try {
        e5.__h.forEach(N2), e5.__h = e5.__h.filter(function(e6) {
          return !e6.__ || L2(e6);
        });
      } catch (n3) {
        t3.some(function(e6) {
          e6.__h && (e6.__h = []);
        }), t3 = [], d2.__e(n3, e5.__v);
      }
    }), f2 && f2(e4, t3);
  }, d2.unmount = function(e4) {
    _2 && _2(e4);
    var t3, n3 = e4.__c;
    n3 && n3.__H && (n3.__H.__.forEach(function(e5) {
      try {
        N2(e5);
      } catch (e6) {
        t3 = e6;
      }
    }), n3.__H = void 0, t3 && d2.__e(t3, n3.__v));
  };
  var D2 = "function" == typeof requestAnimationFrame;
  function T2(e4) {
    var t3, n3 = function() {
      clearTimeout(o3), D2 && cancelAnimationFrame(t3), setTimeout(e4);
    }, o3 = setTimeout(n3, 35);
    D2 && (t3 = requestAnimationFrame(n3));
  }
  function N2(e4) {
    var t3 = a2, n3 = e4.__c;
    "function" == typeof n3 && (e4.__c = void 0, n3()), a2 = t3;
  }
  function L2(e4) {
    var t3 = a2;
    e4.__c = e4.__(), a2 = t3;
  }
  function j2(e4, t3) {
    return !e4 || e4.length !== t3.length || t3.some(function(t4, n3) {
      return t4 !== e4[n3];
    });
  }
  function M2(e4, t3) {
    return "function" == typeof t3 ? t3(e4) : t3;
  }
}, 292(e3) {
  var t2 = [];
  function n2(e4) {
    for (var n3 = -1, o3 = 0; o3 < t2.length; o3++) if (t2[o3].identifier === e4) {
      n3 = o3;
      break;
    }
    return n3;
  }
  function o2(e4, o3) {
    for (var r2 = {}, i2 = [], s2 = 0; s2 < e4.length; s2++) {
      var c2 = e4[s2], l2 = o3.base ? c2[0] + o3.base : c2[0], d2 = r2[l2] || 0, u2 = "".concat(l2, " ").concat(d2);
      r2[l2] = d2 + 1;
      var h2 = n2(u2), p2 = { css: c2[1], media: c2[2], sourceMap: c2[3], supports: c2[4], layer: c2[5] };
      if (-1 !== h2) t2[h2].references++, t2[h2].updater(p2);
      else {
        var f2 = a2(p2, o3);
        o3.byIndex = s2, t2.splice(s2, 0, { identifier: u2, updater: f2, references: 1 });
      }
      i2.push(u2);
    }
    return i2;
  }
  function a2(e4, t3) {
    var n3 = t3.domAPI(t3);
    return n3.update(e4), function(t4) {
      if (t4) {
        if (t4.css === e4.css && t4.media === e4.media && t4.sourceMap === e4.sourceMap && t4.supports === e4.supports && t4.layer === e4.layer) return;
        n3.update(e4 = t4);
      } else n3.remove();
    };
  }
  e3.exports = function(e4, a3) {
    var r2 = o2(e4 = e4 || [], a3 = a3 || {});
    return function(e5) {
      e5 = e5 || [];
      for (var i2 = 0; i2 < r2.length; i2++) {
        var s2 = n2(r2[i2]);
        t2[s2].references--;
      }
      for (var c2 = o2(e5, a3), l2 = 0; l2 < r2.length; l2++) {
        var d2 = n2(r2[l2]);
        0 === t2[d2].references && (t2[d2].updater(), t2.splice(d2, 1));
      }
      r2 = c2;
    };
  };
}, 88(e3) {
  e3.exports = function(e4) {
    var t2 = document.createElement("style");
    return e4.setAttributes(t2, e4.attributes), e4.insert(t2, e4.options), t2;
  };
}, 884(e3, t2, n2) {
  e3.exports = function(e4) {
    var t3 = n2.nc;
    t3 && e4.setAttribute("nonce", t3);
  };
}, 360(e3) {
  var t2, n2 = (t2 = [], function(e4, n3) {
    return t2[e4] = n3, t2.filter(Boolean).join("\n");
  });
  function o2(e4, t3, o3, a3) {
    var r2;
    if (o3) r2 = "";
    else {
      r2 = "", a3.supports && (r2 += "@supports (".concat(a3.supports, ") {")), a3.media && (r2 += "@media ".concat(a3.media, " {"));
      var i2 = void 0 !== a3.layer;
      i2 && (r2 += "@layer".concat(a3.layer.length > 0 ? " ".concat(a3.layer) : "", " {")), r2 += a3.css, i2 && (r2 += "}"), a3.media && (r2 += "}"), a3.supports && (r2 += "}");
    }
    if (e4.styleSheet) e4.styleSheet.cssText = n2(t3, r2);
    else {
      var s2 = document.createTextNode(r2), c2 = e4.childNodes;
      c2[t3] && e4.removeChild(c2[t3]), c2.length ? e4.insertBefore(s2, c2[t3]) : e4.appendChild(s2);
    }
  }
  var a2 = { singleton: null, singletonCounter: 0 };
  e3.exports = function(e4) {
    if ("undefined" == typeof document) return { update: function() {
    }, remove: function() {
    } };
    var t3 = a2.singletonCounter++, n3 = a2.singleton || (a2.singleton = e4.insertStyleElement(e4));
    return { update: function(e5) {
      o2(n3, t3, false, e5);
    }, remove: function(e5) {
      o2(n3, t3, true, e5);
    } };
  };
}, 6(e3, t2, n2) {
  n2.d(t2, { en: () => o2 });
  const o2 = { headlines: { error: "An error has occurred", loginEmail: "Sign in or create account", loginEmailNoSignup: "Sign in", loginFinished: "Login successful", loginPasscode: "Enter passcode", loginPassword: "Enter password", registerAuthenticator: "Create a passkey", registerConfirm: "Create account?", registerPassword: "Set new password", otpSetUp: "Set up authenticator app", profileEmails: "Emails", profilePassword: "Password", profilePasskeys: "Passkeys", isPrimaryEmail: "Primary email address", setPrimaryEmail: "Set primary email address", createEmail: "Enter a new email", createUsername: "Enter a new username", emailVerified: "Verified", emailUnverified: "Unverified", emailDelete: "Delete", renamePasskey: "Rename passkey", deletePasskey: "Delete passkey", lastUsedAt: "Last used at", createdAt: "Created at", connectedAccounts: "Connected accounts", deleteAccount: "Delete account", accountNotFound: "Account not found", signIn: "Sign in", signUp: "Create account", selectLoginMethod: "Select login method", setupLoginMethod: "Set up login method", lastUsed: "Last seen", ipAddress: "IP address", revokeSession: "Revoke session", profileSessions: "Sessions", mfaSetUp: "Set up MFA", securityKeySetUp: "Add security key", securityKeyLogin: "Security key", otpLogin: "Authentication code", renameSecurityKey: "Rename security key", deleteSecurityKey: "Delete security key", securityKeys: "Security keys", authenticatorApp: "Authenticator app", authenticatorAppAlreadySetUp: "Authenticator app is set up", authenticatorAppNotSetUp: "Set up authenticator app", trustDevice: "Trust this browser?", deleteIdentity: "Delete connection" }, texts: { enterPasscode: "Enter the passcode sent to your email address.", enterPasscodeNoEmail: "Enter the passcode that was sent to your primary email address.", setupPasskey: "Sign in to your account easily and securely with a passkey. Note: Your biometric data is only stored on your devices and will never be shared with anyone.", createAccount: 'No account exists for "{emailAddress}". Do you want to create a new account?', otpEnterVerificationCode: "Enter the one-time password (OTP) obtained from your authenticator app below:", otpScanQRCode: "Scan the QR code using your authenticator app (such as Google Authenticator or any other TOTP app). Alternatively, you can manually enter the OTP secret key into the app.", otpSecretKey: "OTP secret key", passwordFormatHint: "Must be between {minLength} and {maxLength} characters long.", securityKeySetUp: "Use a dedicated security key via USB, Bluetooth, or NFC, or your mobile phone. Connect or activate your security key, then click the button below and follow the prompts to complete the registration.", setPrimaryEmail: "Set this email address to be used for contacting you.", isPrimaryEmail: "This email address will be used to contact you if necessary.", emailVerified: "This email address has been verified.", emailUnverified: "This email address has not been verified.", emailDelete: "If you delete this email address, it can no longer be used to sign in.", renamePasskey: "Set a name for the passkey.", deletePasskey: "Delete this passkey from your account.", deleteAccount: "Are you sure you want to delete this account? All data will be deleted immediately and cannot be recovered.", noAccountExists: 'No account exists for "{emailAddress}".', selectLoginMethodForFutureLogins: "Select one of the following login methods to use for future logins.", howDoYouWantToLogin: "How do you want to login?", mfaSetUp: "Protect your account with Multi-Factor Authentication (MFA). MFA adds an additional step to your login process, ensuring that even if your password or email account is compromised, your account stays secure.", securityKeyLogin: "Connect or activate your security key, then click the button below. Once ready, use it via USB, NFC, your mobile phone. Follow the prompts to complete the login process.", otpLogin: "Open your authenticator app to obtain the one-time password (OTP). Enter the code in the field below to complete your login.", renameSecurityKey: "Set a name for the security key.", deleteSecurityKey: "Delete this security key from your account.", authenticatorAppAlreadySetUp: "Your account is secured with an authenticator app that generates time-based one-time passwords (TOTP) for multi-factor authentication.", authenticatorAppNotSetUp: "Secure your account with an authenticator app that generates time-based one-time passwords (TOTP) for multi-factor authentication.", trustDevice: "If you trust this browser, you won\u2019t need to enter your OTP (One-Time-Password) or use your security key for multi-factor authentication (MFA) the next time you log in." }, labels: { or: "or", no: "no", yes: "yes", email: "Email", continue: "Continue", copied: "copied", skip: "Skip", save: "Save", password: "Password", passkey: "Passkey", passcode: "Passcode", signInPassword: "Sign in with a password", signInPasscode: "Sign in with a passcode", forgotYourPassword: "Forgot your password?", back: "Back", signInPasskey: "Sign in with a passkey", registerAuthenticator: "Create a passkey", signIn: "Sign in", signUp: "Create account", sendNewPasscode: "Send new code", passwordRetryAfter: "Retry in {passwordRetryAfter}", passcodeResendAfter: "Request a new code in {passcodeResendAfter}", unverifiedEmail: "unverified", primaryEmail: "primary", setAsPrimaryEmail: "Set as primary", verify: "Verify", delete: "Delete", newEmailAddress: "New email address", newPassword: "New password", rename: "Rename", newPasskeyName: "New passkey name", addEmail: "Add email", createPasskey: "Create a passkey", webauthnUnsupported: "Passkeys are not supported by your browser", signInWith: "Continue with {provider}", deleteAccount: "Yes, delete this account.", emailOrUsername: "Email or username", username: "Username", optional: "optional", dontHaveAnAccount: "Don't have an account?", alreadyHaveAnAccount: "Already have an account?", changeUsername: "Change username", setUsername: "Set username", changePassword: "Change password", setPassword: "Set password", revoke: "Revoke", currentSession: "Current session", authenticatorApp: "Authenticator app", securityKey: "Security key", securityKeyUse: "Use security key", newSecurityKeyName: "New security key name", createSecurityKey: "Add a security key", authenticatorAppManage: "Manage authenticator app", authenticatorAppAdd: "Set up", configured: "configured", useAnotherMethod: "Use another method", lastUsed: "Last used", trustDevice: "Trust this browser", staySignedIn: "Stay signed in", connectAccount: "Connect account" }, errors: { somethingWentWrong: "A technical error has occurred. Please try again later.", requestTimeout: "The request timed out.", invalidPassword: "Wrong email or password.", invalidPasscode: "The passcode provided was not correct.", passcodeAttemptsReached: "The passcode was entered incorrectly too many times. Please request a new code.", tooManyRequests: "Too many requests have been made. Please wait to repeat the requested operation.", unauthorized: "Your session has expired. Please log in again.", invalidWebauthnCredential: "This passkey cannot be used anymore.", passcodeExpired: "The passcode has expired. Please request a new one.", userVerification: "User verification required. Please ensure your authenticator device is protected with a PIN or biometric.", emailAddressAlreadyExistsError: "The email address already exists.", maxNumOfEmailAddressesReached: "No further email addresses can be added.", thirdPartyAccessDenied: "Access denied. The request was cancelled by the user or the provider has denied access for other reasons.", thirdPartyMultipleAccounts: "Cannot identify account. The email address is used by multiple accounts.", thirdPartyUnverifiedEmail: "Email verification required. Please verify the used email address with your provider.", signupDisabled: "Account registration is disabled.", handlerNotFoundError: "The current step in your process is not supported by this application version. Please try again later or contact support if the issue persists." }, flowErrors: { technical_error: "A technical error has occurred. Please try again later.", flow_expired_error: "The session has expired, please click the button to restart.", value_invalid_error: "The entered value is invalid.", passcode_invalid: "The passcode provided was not correct.", passkey_invalid: "This passkey cannot be used anymore.", passcode_max_attempts_reached: "The passcode was entered incorrectly too many times. Please request a new code.", rate_limit_exceeded: "Too many requests have been made. Please wait to repeat the requested operation.", unknown_username_error: "The username is unknown.", unknown_email_error: "The email address is unknown.", username_already_exists: "The username is already taken.", invalid_username_error: "The username must contain only letters, numbers, and underscores.", email_already_exists: "The email is already taken.", not_found: "The requested resource was not found.", operation_not_permitted_error: "The operation is not permitted.", flow_discontinuity_error: "The process cannot be continued due to user settings or the provider's configuration.", form_data_invalid_error: "The submitted form data contains errors.", unauthorized: "Your session has expired. Please log in again.", value_missing_error: "The value is missing.", value_too_long_error: "Value is too long.", value_too_short_error: "The value is too short.", webauthn_credential_invalid_mfa_only: "This credential can be used as a second factor security key only.", webauthn_credential_already_exists: "The request either timed out, was canceled or the device is already registered. Please try again or try using another device.", platform_authenticator_required: "Your account is configured to use platform authenticators, but your current device or browser does not support this feature. Please try again with a compatible device or browser.", third_party_access_denied: "Access denied. The request was cancelled by the user or the provider has denied access for other reasons." } };
}, 597(e3, t2, n2) {
  n2.d(t2, { A: () => s2 });
  var o2 = n2(601), a2 = n2.n(o2), r2 = n2(314), i2 = n2.n(r2)()(a2());
  i2.push([e3.id, '.hanko_accordion{font-weight:var(--font-weight, 400);font-size:var(--font-size, 16px);font-family:var(--font-family, sans-serif);line-height:var(--line-height, 1.4rem);width:100%;overflow:hidden}.hanko_accordion .hanko_accordionItem{color:var(--color, #333333);margin:.25rem 0;overflow:hidden}.hanko_accordion .hanko_accordionItem.hanko_dropdown{margin:0}.hanko_accordion .hanko_accordionItem .hanko_label{border-radius:var(--border-radius, 8px);border-style:none;height:var(--item-height, 42px);background:var(--background-color, white);box-sizing:border-box;display:flex;align-items:center;justify-content:space-between;padding:0 1rem;margin:0;cursor:pointer;transition:all .35s}.hanko_accordion .hanko_accordionItem .hanko_label .hanko_labelText{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hanko_accordion .hanko_accordionItem .hanko_label .hanko_labelText .hanko_description{color:var(--color-shade-1, #8f9095)}.hanko_accordion .hanko_accordionItem .hanko_label.hanko_dropdown{margin:0;color:var(--link-color, #506cf0);justify-content:flex-start}.hanko_accordion .hanko_accordionItem .hanko_label:hover{color:var(--brand-contrast-color, white);background:var(--brand-color-shade-1, #6b84fb)}.hanko_accordion .hanko_accordionItem .hanko_label:hover .hanko_description{color:var(--brand-contrast-color, white)}.hanko_accordion .hanko_accordionItem .hanko_label:hover.hanko_dropdown{color:var(--link-color, #506cf0);background:none}.hanko_accordion .hanko_accordionItem .hanko_label:not(.hanko_dropdown)::after{content:"\u276F";width:1rem;text-align:center;transition:all .35s}.hanko_accordion .hanko_accordionItem .hanko_accordionInput{position:absolute;opacity:0;z-index:-1}.hanko_accordion .hanko_accordionItem .hanko_accordionInput:checked+.hanko_label{color:var(--brand-contrast-color, white);background:var(--brand-color, #506cf0)}.hanko_accordion .hanko_accordionItem .hanko_accordionInput:checked+.hanko_label .hanko_description{color:var(--brand-contrast-color, white)}.hanko_accordion .hanko_accordionItem .hanko_accordionInput:checked+.hanko_label.hanko_dropdown{color:var(--link-color, #506cf0);background:none}.hanko_accordion .hanko_accordionItem .hanko_accordionInput:checked+.hanko_label:not(.hanko_dropdown)::after{transform:rotate(90deg)}.hanko_accordion .hanko_accordionItem .hanko_accordionInput:checked+.hanko_label~.hanko_accordionContent{margin:.25rem 1rem;opacity:1;max-height:100vh}.hanko_accordion .hanko_accordionItem .hanko_accordionContent{max-height:0;margin:0 1rem;opacity:0;overflow:hidden;transition:all .35s}.hanko_accordion .hanko_accordionItem .hanko_accordionContent.hanko_dropdownContent{border-style:none}', ""]), i2.locals = { accordion: "hanko_accordion", accordionItem: "hanko_accordionItem", dropdown: "hanko_dropdown", label: "hanko_label", labelText: "hanko_labelText", description: "hanko_description", accordionInput: "hanko_accordionInput", accordionContent: "hanko_accordionContent", dropdownContent: "hanko_dropdownContent" };
  const s2 = i2;
}, 217(e3, t2, n2) {
  n2.d(t2, { A: () => s2 });
  var o2 = n2(601), a2 = n2.n(o2), r2 = n2(314), i2 = n2.n(r2)()(a2());
  i2.push([e3.id, ".hanko_errorBox{font-weight:var(--font-weight, 400);font-size:var(--font-size, 16px);font-family:var(--font-family, sans-serif);line-height:var(--line-height, 1.4rem);border-radius:var(--border-radius, 8px);border-style:var(--border-style, solid);border-width:var(--border-width, 1px);color:var(--error-color, #e82020);background:var(--background-color, white);margin:var(--item-margin, 0.5rem 0);display:flex;align-items:start;box-sizing:border-box;line-height:1.5rem;padding:.25em;gap:.2em}.hanko_errorBox>span{display:inline-flex}.hanko_errorBox>span:first-child{padding:.25em 0 .25em .19em}.hanko_errorBox[hidden]{display:none}.hanko_errorMessage{color:var(--error-color, #e82020)}", ""]), i2.locals = { errorBox: "hanko_errorBox", errorMessage: "hanko_errorMessage" };
  const s2 = i2;
}, 681(e3, t2, n2) {
  n2.d(t2, { A: () => s2 });
  var o2 = n2(601), a2 = n2.n(o2), r2 = n2(314), i2 = n2.n(r2)()(a2());
  i2.push([e3.id, '.hanko_form{display:flex;flex-grow:1}.hanko_form .hanko_ul{flex-grow:1;margin:var(--item-margin, 0.5rem 0);padding-inline-start:0;list-style-type:none;display:flex;flex-wrap:wrap;gap:1em}.hanko_form .hanko_li{display:flex;max-width:100%;flex-grow:1;flex-basis:min-content}.hanko_form .hanko_li.hanko_maxWidth{min-width:100%}.hanko_button{font-weight:var(--font-weight, 400);font-size:var(--font-size, 16px);font-family:var(--font-family, sans-serif);line-height:var(--line-height, 1.4rem);border-radius:var(--border-radius, 8px);border-style:var(--border-style, solid);border-width:var(--border-width, 1px);white-space:nowrap;width:100%;min-width:var(--button-min-width, 7em);min-height:var(--item-height, 42px);outline:none;cursor:pointer;transition:.1s ease-out;flex-grow:1;flex-shrink:1;display:inline-flex;position:relative}.hanko_button[data-bubble]:before{font-weight:var(--font-weight, 400);font-size:var(--font-size, 16px);font-family:var(--font-family, sans-serif);line-height:var(--line-height, 1.4rem);border-radius:var(--border-radius, 8px);border-style:var(--border-style, solid);border-width:var(--border-width, 1px);padding:2px 8px;font-size:9px;line-height:normal;content:attr(data-bubble);display:block;position:absolute;bottom:80%;left:80%;white-space:nowrap;width:max-content;text-align:center;background-color:inherit;color:var(--brand-color-shade-1, #6b84fb);border-color:var(--brand-color-shade-1, #6b84fb)}.hanko_button:disabled{cursor:default}.hanko_button.hanko_primary{color:var(--brand-contrast-color, white);background:var(--brand-color, #506cf0);border-color:var(--brand-color, #506cf0);justify-content:center}.hanko_button.hanko_primary:hover{color:var(--brand-contrast-color, white);background:var(--brand-color-shade-1, #6b84fb);border-color:var(--brand-color, #506cf0)}.hanko_button.hanko_primary:focus{color:var(--brand-contrast-color, white);background:var(--brand-color, #506cf0);border-color:var(--color, #333333)}.hanko_button.hanko_primary:disabled{color:var(--color-shade-1, #8f9095);background:var(--color-shade-2, #e5e6ef);border-color:var(--color-shade-2, #e5e6ef)}.hanko_button.hanko_secondary{color:var(--color, #333333);background:var(--background-color, white);border-color:var(--color-shade-1, #8f9095);justify-content:center}.hanko_button.hanko_secondary:hover{color:var(--color, #333333);background:var(--color-shade-2, #e5e6ef);border-color:var(--color, #333333)}.hanko_button.hanko_secondary:focus{color:var(--color, #333333);background:var(--background-color, white);border-color:var(--brand-color, #506cf0)}.hanko_button.hanko_secondary:disabled{color:var(--color-shade-1, #8f9095);background:var(--color-shade-2, #e5e6ef);border-color:var(--color-shade-1, #8f9095)}.hanko_button.hanko_dangerous{color:var(--error-color, #e82020);background:var(--background-color, white);border-color:var(--error-color, #e82020);flex-grow:0;width:auto}.hanko_caption{flex-wrap:wrap;display:flex;justify-content:space-between;align-items:baseline}.hanko_inputWrapper{flex-grow:1;position:relative;display:flex;min-width:var(--input-min-width, 14em);max-width:100%}.hanko_input{font-weight:var(--font-weight, 400);font-size:var(--font-size, 16px);font-family:var(--font-family, sans-serif);line-height:var(--line-height, 1.4rem);border-radius:var(--border-radius, 8px);border-style:var(--border-style, solid);border-width:var(--border-width, 1px);height:var(--item-height, 42px);color:var(--color, #333333);border-color:var(--color-shade-1, #8f9095);background:var(--background-color, white)}.hanko_input.hanko_error{border-color:var(--error-color, #e82020)}.hanko_input{padding:0 .5rem;outline:none;width:100%;box-sizing:border-box;transition:.1s ease-out}.hanko_input:-webkit-autofill,.hanko_input:-webkit-autofill:hover,.hanko_input:-webkit-autofill:focus{-webkit-text-fill-color:var(--color, #333333);-webkit-box-shadow:0 0 0 50px var(--background-color, white) inset}.hanko_input::-ms-reveal,.hanko_input::-ms-clear{display:none}.hanko_input::placeholder{color:var(--color-shade-1, #8f9095)}.hanko_input:focus{color:var(--color, #333333);border-color:var(--color, #333333)}.hanko_input:disabled{color:var(--color-shade-1, #8f9095);background:var(--color-shade-2, #e5e6ef);border-color:var(--color-shade-1, #8f9095)}.hanko_passcodeInputWrapper{flex-grow:1;min-width:var(--input-min-width, 14em);max-width:fit-content;position:relative;display:flex;justify-content:space-between}.hanko_passcodeInputWrapper .hanko_passcodeDigitWrapper{flex-grow:1;margin:0 .5rem 0 0}.hanko_passcodeInputWrapper .hanko_passcodeDigitWrapper:last-child{margin:0}.hanko_passcodeInputWrapper .hanko_passcodeDigitWrapper .hanko_input{text-align:center}.hanko_checkboxWrapper{font-weight:var(--font-weight, 400);font-size:var(--font-size, 16px);font-family:var(--font-family, sans-serif);line-height:var(--line-height, 1.4rem);color:var(--color, #333333);align-items:center;display:flex}.hanko_checkboxWrapper .hanko_label{color:inherit;padding-left:.5rem;cursor:pointer}.hanko_checkboxWrapper .hanko_label.hanko_disabled{cursor:default;color:var(--color-shade-1, #8f9095)}.hanko_checkboxWrapper .hanko_checkbox{border:currentColor solid 1px;border-radius:.15em;appearance:none;-webkit-appearance:none;width:1.1rem;height:1.1rem;margin:0;color:currentColor;background-color:var(--background-color, white);font:inherit;box-shadow:none;display:inline-flex;place-content:center;cursor:pointer}.hanko_checkboxWrapper .hanko_checkbox:checked{background-color:var(--color, #333333)}.hanko_checkboxWrapper .hanko_checkbox:disabled{cursor:default;background-color:var(--color-shade-2, #e5e6ef);border-color:var(--color-shade-1, #8f9095)}.hanko_checkboxWrapper .hanko_checkbox:checked:after{content:"\u2713";color:var(--background-color, white);position:absolute;line-height:1.1rem}.hanko_checkboxWrapper .hanko_checkbox:disabled:after{color:var(--color-shade-1, #8f9095)}', ""]), i2.locals = { form: "hanko_form", ul: "hanko_ul", li: "hanko_li", maxWidth: "hanko_maxWidth", button: "hanko_button", primary: "hanko_primary", secondary: "hanko_secondary", dangerous: "hanko_dangerous", caption: "hanko_caption", inputWrapper: "hanko_inputWrapper", input: "hanko_input", error: "hanko_error", passcodeInputWrapper: "hanko_passcodeInputWrapper", passcodeDigitWrapper: "hanko_passcodeDigitWrapper", checkboxWrapper: "hanko_checkboxWrapper", label: "hanko_label", disabled: "hanko_disabled", checkbox: "hanko_checkbox" };
  const s2 = i2;
}, 547(e3, t2, n2) {
  n2.d(t2, { A: () => s2 });
  var o2 = n2(601), a2 = n2.n(o2), r2 = n2(314), i2 = n2.n(r2)()(a2());
  i2.push([e3.id, ".hanko_headline{color:var(--color, #333333);font-family:var(--font-family, sans-serif);text-align:left;letter-spacing:0;font-style:normal;line-height:1.1}.hanko_headline.hanko_grade1{font-size:var(--headline1-font-size, 24px);font-weight:var(--headline1-font-weight, 600);margin:var(--headline1-margin, 0 0 0.5rem)}.hanko_headline.hanko_grade2{font-size:var(--headline2-font-size, 16px);font-weight:var(--headline2-font-weight, 600);margin:var(--headline2-margin, 1rem 0 0.5rem)}", ""]), i2.locals = { headline: "hanko_headline", grade1: "hanko_grade1", grade2: "hanko_grade2" };
  const s2 = i2;
}, 313(e3, t2, n2) {
  n2.d(t2, { A: () => s2 });
  var o2 = n2(601), a2 = n2.n(o2), r2 = n2(314), i2 = n2.n(r2)()(a2());
  i2.push([e3.id, ".hanko_icon,.hanko_loadingSpinnerWrapper .hanko_loadingSpinner,.hanko_loadingSpinnerWrapperIcon .hanko_loadingSpinner,.hanko_exclamationMark,.hanko_checkmark{display:inline-block;fill:var(--brand-contrast-color, white);width:18px}.hanko_icon.hanko_secondary,.hanko_loadingSpinnerWrapper .hanko_secondary.hanko_loadingSpinner,.hanko_loadingSpinnerWrapperIcon .hanko_secondary.hanko_loadingSpinner,.hanko_secondary.hanko_exclamationMark,.hanko_secondary.hanko_checkmark{fill:var(--color, #333333)}.hanko_icon.hanko_disabled,.hanko_loadingSpinnerWrapper .hanko_disabled.hanko_loadingSpinner,.hanko_loadingSpinnerWrapperIcon .hanko_disabled.hanko_loadingSpinner,.hanko_disabled.hanko_exclamationMark,.hanko_disabled.hanko_checkmark{fill:var(--color-shade-1, #8f9095)}.hanko_checkmark{fill:var(--brand-color, #506cf0)}.hanko_checkmark.hanko_secondary{fill:var(--color-shade-1, #8f9095)}.hanko_checkmark.hanko_fadeOut{animation:hanko_fadeOut ease-out 1.5s forwards !important}@keyframes hanko_fadeOut{0%{opacity:1}100%{opacity:0}}.hanko_exclamationMark{fill:var(--error-color, #e82020)}.hanko_loadingSpinnerWrapperIcon{width:100%;column-gap:10px;margin-left:10px}.hanko_loadingSpinnerWrapper,.hanko_loadingSpinnerWrapperIcon{display:inline-flex;align-items:center;height:100%;margin:0 5px;justify-content:inherit;flex-wrap:inherit}.hanko_loadingSpinnerWrapper.hanko_centerContent,.hanko_centerContent.hanko_loadingSpinnerWrapperIcon{justify-content:center}.hanko_loadingSpinnerWrapper.hanko_maxWidth,.hanko_maxWidth.hanko_loadingSpinnerWrapperIcon{width:100%}.hanko_loadingSpinnerWrapper .hanko_loadingSpinner,.hanko_loadingSpinnerWrapperIcon .hanko_loadingSpinner{fill:var(--brand-color, #506cf0);animation:hanko_spin 500ms ease-in-out infinite}.hanko_loadingSpinnerWrapper.hanko_secondary,.hanko_secondary.hanko_loadingSpinnerWrapperIcon{fill:var(--color-shade-1, #8f9095)}@keyframes hanko_spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}.hanko_googleIcon.hanko_disabled{fill:var(--color-shade-1, #8f9095)}.hanko_googleIcon.hanko_blue{fill:#4285f4}.hanko_googleIcon.hanko_green{fill:#34a853}.hanko_googleIcon.hanko_yellow{fill:#fbbc05}.hanko_googleIcon.hanko_red{fill:#ea4335}.hanko_microsoftIcon.hanko_disabled{fill:var(--color-shade-1, #8f9095)}.hanko_microsoftIcon.hanko_blue{fill:#00a4ef}.hanko_microsoftIcon.hanko_green{fill:#7fba00}.hanko_microsoftIcon.hanko_yellow{fill:#ffb900}.hanko_microsoftIcon.hanko_red{fill:#f25022}.hanko_facebookIcon.hanko_outline{fill:#0866ff}.hanko_facebookIcon.hanko_disabledOutline{fill:var(--color-shade-1, #8f9095)}.hanko_facebookIcon.hanko_letter{fill:#fff}.hanko_facebookIcon.hanko_disabledLetter{fill:var(--color-shade-2, #e5e6ef)}", ""]), i2.locals = { icon: "hanko_icon", loadingSpinnerWrapper: "hanko_loadingSpinnerWrapper", loadingSpinner: "hanko_loadingSpinner", loadingSpinnerWrapperIcon: "hanko_loadingSpinnerWrapperIcon", exclamationMark: "hanko_exclamationMark", checkmark: "hanko_checkmark", secondary: "hanko_secondary", disabled: "hanko_disabled", fadeOut: "hanko_fadeOut", centerContent: "hanko_centerContent", maxWidth: "hanko_maxWidth", spin: "hanko_spin", googleIcon: "hanko_googleIcon", blue: "hanko_blue", green: "hanko_green", yellow: "hanko_yellow", red: "hanko_red", microsoftIcon: "hanko_microsoftIcon", facebookIcon: "hanko_facebookIcon", outline: "hanko_outline", disabledOutline: "hanko_disabledOutline", letter: "hanko_letter", disabledLetter: "hanko_disabledLetter" };
  const s2 = i2;
}, 579(e3, t2, n2) {
  n2.d(t2, { A: () => s2 });
  var o2 = n2(601), a2 = n2.n(o2), r2 = n2(314), i2 = n2.n(r2)()(a2());
  i2.push([e3.id, ".hanko_link{font-weight:var(--font-weight, 400);font-size:var(--font-size, 16px);font-family:var(--font-family, sans-serif);line-height:var(--line-height, 1.4rem);color:var(--link-color, #506cf0);text-decoration:var(--link-text-decoration, none);cursor:pointer;background:none !important;border:none;padding:0 !important;transition:all .1s}.hanko_link:hover{text-decoration:var(--link-text-decoration-hover, underline)}.hanko_link:disabled{color:var(--color, #333333) !important;pointer-events:none;cursor:default}.hanko_link.hanko_danger{color:var(--error-color, #e82020)}.hanko_linkWrapper{display:inline-flex;flex-direction:row;justify-content:space-between;align-items:center;overflow:hidden}.hanko_linkWrapper.hanko_reverse{flex-direction:row-reverse}", ""]), i2.locals = { link: "hanko_link", danger: "hanko_danger", linkWrapper: "hanko_linkWrapper", reverse: "hanko_reverse" };
  const s2 = i2;
}, 8(e3, t2, n2) {
  n2.d(t2, { A: () => s2 });
  var o2 = n2(601), a2 = n2.n(o2), r2 = n2(314), i2 = n2.n(r2)()(a2());
  i2.push([e3.id, ".hanko_otpCreationDetails{font-weight:var(--font-weight, 400);font-size:var(--font-size, 16px);font-family:var(--font-family, sans-serif);line-height:var(--line-height, 1.4rem);color:var(--color, #333333);margin:var(--item-margin, 0.5rem 0);display:flex;justify-content:center;align-items:center;flex-direction:column;font-size:smaller}", ""]), i2.locals = { otpCreationDetails: "hanko_otpCreationDetails" };
  const s2 = i2;
}, 193(e3, t2, n2) {
  n2.d(t2, { A: () => s2 });
  var o2 = n2(601), a2 = n2.n(o2), r2 = n2(314), i2 = n2.n(r2)()(a2());
  i2.push([e3.id, ".hanko_paragraph{font-weight:var(--font-weight, 400);font-size:var(--font-size, 16px);font-family:var(--font-family, sans-serif);line-height:var(--line-height, 1.4rem);color:var(--color, #333333);margin:var(--item-margin, 0.5rem 0);text-align:left;word-break:break-word}.hanko_paragraph.hanko_center{align-items:center}.hanko_paragraph.hanko_column{display:flex;flex-direction:column;width:100%}", ""]), i2.locals = { paragraph: "hanko_paragraph", center: "hanko_center", column: "hanko_column" };
  const s2 = i2;
}, 751(e3, t2, n2) {
  n2.d(t2, { A: () => s2 });
  var o2 = n2(601), a2 = n2.n(o2), r2 = n2(314), i2 = n2.n(r2)()(a2());
  i2.push([e3.id, ".hanko_spacer{height:1em}.hanko_divider{font-weight:var(--font-weight, 400);font-size:var(--font-size, 16px);font-family:var(--font-family, sans-serif);line-height:var(--line-height, 1.4rem);display:flex;visibility:var(--divider-visibility, visible);color:var(--color-shade-1, #8f9095);margin:var(--item-margin, 0.5rem 0);padding:.5em 0}.hanko_divider .hanko_line{border-bottom-style:var(--border-style, solid);border-bottom-width:var(--border-width, 1px);color:inherit;font:inherit;width:100%}.hanko_divider .hanko_text{font:inherit;color:inherit;background:var(--background-color, white);padding:var(--divider-padding, 0 42px);line-height:.1em}", ""]), i2.locals = { spacer: "hanko_spacer", divider: "hanko_divider", line: "hanko_line", text: "hanko_text" };
  const s2 = i2;
}, 890(e3, t2, n2) {
  n2.d(t2, { A: () => s2 });
  var o2 = n2(601), a2 = n2.n(o2), r2 = n2(314), i2 = n2.n(r2)()(a2());
  i2.push([e3.id, ".hanko_container{background-color:var(--background-color, white);padding:var(--container-padding, 30px);max-width:var(--container-max-width, 410px);display:flex;flex-direction:column;flex-wrap:nowrap;justify-content:center;align-items:center;align-content:flex-start;box-sizing:border-box}.hanko_content{box-sizing:border-box;flex:0 1 auto;width:100%;height:100%}.hanko_footer{padding:.5rem 0 0;box-sizing:border-box;width:100%}.hanko_footer :nth-child(1){float:left}.hanko_footer :nth-child(2){float:right}.hanko_clipboardContainer{display:flex}.hanko_clipboardIcon{display:flex;margin:auto;cursor:pointer}", ""]), i2.locals = { container: "hanko_container", content: "hanko_content", footer: "hanko_footer", clipboardContainer: "hanko_clipboardContainer", clipboardIcon: "hanko_clipboardIcon" };
  const s2 = i2;
}, 314(e3) {
  e3.exports = function(e4) {
    var t2 = [];
    return t2.toString = function() {
      return this.map(function(t3) {
        var n2 = "", o2 = void 0 !== t3[5];
        return t3[4] && (n2 += "@supports (".concat(t3[4], ") {")), t3[2] && (n2 += "@media ".concat(t3[2], " {")), o2 && (n2 += "@layer".concat(t3[5].length > 0 ? " ".concat(t3[5]) : "", " {")), n2 += e4(t3), o2 && (n2 += "}"), t3[2] && (n2 += "}"), t3[4] && (n2 += "}"), n2;
      }).join("");
    }, t2.i = function(e5, n2, o2, a2, r2) {
      "string" == typeof e5 && (e5 = [[null, e5, void 0]]);
      var i2 = {};
      if (o2) for (var s2 = 0; s2 < this.length; s2++) {
        var c2 = this[s2][0];
        null != c2 && (i2[c2] = true);
      }
      for (var l2 = 0; l2 < e5.length; l2++) {
        var d2 = [].concat(e5[l2]);
        o2 && i2[d2[0]] || (void 0 !== r2 && (void 0 === d2[5] || (d2[1] = "@layer".concat(d2[5].length > 0 ? " ".concat(d2[5]) : "", " {").concat(d2[1], "}")), d2[5] = r2), n2 && (d2[2] ? (d2[1] = "@media ".concat(d2[2], " {").concat(d2[1], "}"), d2[2] = n2) : d2[2] = n2), a2 && (d2[4] ? (d2[1] = "@supports (".concat(d2[4], ") {").concat(d2[1], "}"), d2[4] = a2) : d2[4] = "".concat(a2)), t2.push(d2));
      }
    }, t2;
  };
}, 601(e3) {
  e3.exports = function(e4) {
    return e4[1];
  };
}, 452(e3, t2) {
  var n2;
  !(function() {
    var o2 = {}.hasOwnProperty;
    function a2() {
      for (var e4 = "", t3 = 0; t3 < arguments.length; t3++) {
        var n3 = arguments[t3];
        n3 && (e4 = i2(e4, r2(n3)));
      }
      return e4;
    }
    function r2(e4) {
      if ("string" == typeof e4 || "number" == typeof e4) return e4;
      if ("object" != typeof e4) return "";
      if (Array.isArray(e4)) return a2.apply(null, e4);
      if (e4.toString !== Object.prototype.toString && !e4.toString.toString().includes("[native code]")) return e4.toString();
      var t3 = "";
      for (var n3 in e4) o2.call(e4, n3) && e4[n3] && (t3 = i2(t3, n3));
      return t3;
    }
    function i2(e4, t3) {
      return t3 ? e4 ? e4 + " " + t3 : e4 + t3 : e4;
    }
    e3.exports ? (a2.default = a2, e3.exports = a2) : void 0 === (n2 = function() {
      return a2;
    }.apply(t2, [])) || (e3.exports = n2);
  })();
} };
var t = {};
function n(o2) {
  var a2 = t[o2];
  if (void 0 !== a2) return a2.exports;
  var r2 = t[o2] = { id: o2, exports: {} };
  return e[o2].call(r2.exports, r2, r2.exports, n), r2.exports;
}
n.n = (e3) => {
  var t2 = e3 && e3.__esModule ? () => e3.default : () => e3;
  return n.d(t2, { a: t2 }), t2;
}, n.d = (e3, t2) => {
  for (var o2 in t2) n.o(t2, o2) && !n.o(e3, o2) && Object.defineProperty(e3, o2, { enumerable: true, get: t2[o2] });
}, n.o = (e3, t2) => Object.prototype.hasOwnProperty.call(e3, t2), n.r = (e3) => {
  "undefined" != typeof Symbol && Symbol.toStringTag && Object.defineProperty(e3, Symbol.toStringTag, { value: "Module" }), Object.defineProperty(e3, "__esModule", { value: true });
}, n.nc = void 0;
var o = {};
n.r(o), n.d(o, { apple: () => It, checkmark: () => Et, copy: () => Pt, customProvider: () => Ot, discord: () => Dt, exclamation: () => Tt, facebook: () => Nt, github: () => Lt, google: () => jt, linkedin: () => Mt, mail: () => Ut, microsoft: () => Ft, passkey: () => Wt, password: () => Ht, qrCodeScanner: () => Rt, securityKey: () => qt, spinner: () => zt });
var a = n(616);
var r = 0;
function i(e3, t2, n2, o2, i2, s2) {
  t2 || (t2 = {});
  var c2, l2, d2 = t2;
  if ("ref" in d2) for (l2 in d2 = {}, t2) "ref" == l2 ? c2 = t2[l2] : d2[l2] = t2[l2];
  var u2 = { type: e3, props: d2, key: n2, ref: c2, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: --r, __i: -1, __u: 0, __source: i2, __self: s2 };
  if ("function" == typeof e3 && (c2 = e3.defaultProps)) for (l2 in c2) void 0 === d2[l2] && (d2[l2] = c2[l2]);
  return a.options.vnode && a.options.vnode(u2), u2;
}
function s() {
  return s = Object.assign ? Object.assign.bind() : function(e3) {
    for (var t2 = 1; t2 < arguments.length; t2++) {
      var n2 = arguments[t2];
      for (var o2 in n2) Object.prototype.hasOwnProperty.call(n2, o2) && (e3[o2] = n2[o2]);
    }
    return e3;
  }, s.apply(this, arguments);
}
var c = ["context", "children"];
function l(e3) {
  this.getChildContext = function() {
    return e3.context;
  };
  var t2 = e3.children, n2 = (function(e4, t3) {
    if (null == e4) return {};
    var n3, o2, a2 = {}, r2 = Object.keys(e4);
    for (o2 = 0; o2 < r2.length; o2++) t3.indexOf(n3 = r2[o2]) >= 0 || (a2[n3] = e4[n3]);
    return a2;
  })(e3, c);
  return (0, a.cloneElement)(t2, n2);
}
function d() {
  var e3 = new CustomEvent("_preact", { detail: {}, bubbles: true, cancelable: true });
  this.dispatchEvent(e3), this._vdom = (0, a.h)(l, s({}, this._props, { context: e3.detail.context }), _(this, this._vdomComponent)), (this.hasAttribute("hydrate") ? a.hydrate : a.render)(this._vdom, this._root);
}
function u(e3) {
  return e3.replace(/-(\w)/g, function(e4, t2) {
    return t2 ? t2.toUpperCase() : "";
  });
}
function h(e3, t2, n2) {
  if (this._vdom) {
    var o2 = {};
    o2[e3] = n2 = null == n2 ? void 0 : n2, o2[u(e3)] = n2, this._vdom = (0, a.cloneElement)(this._vdom, o2), (0, a.render)(this._vdom, this._root);
  }
}
function p() {
  (0, a.render)(this._vdom = null, this._root);
}
function f(e3, t2) {
  var n2 = this;
  return (0, a.h)("slot", s({}, e3, { ref: function(e4) {
    e4 ? (n2.ref = e4, n2._listener || (n2._listener = function(e5) {
      e5.stopPropagation(), e5.detail.context = t2;
    }, e4.addEventListener("_preact", n2._listener))) : n2.ref.removeEventListener("_preact", n2._listener);
  } }));
}
function _(e3, t2) {
  if (3 === e3.nodeType) return e3.data;
  if (1 !== e3.nodeType) return null;
  var n2 = [], o2 = {}, r2 = 0, i2 = e3.attributes, s2 = e3.childNodes;
  for (r2 = i2.length; r2--; ) "slot" !== i2[r2].name && (o2[i2[r2].name] = i2[r2].value, o2[u(i2[r2].name)] = i2[r2].value);
  for (r2 = s2.length; r2--; ) {
    var c2 = _(s2[r2], null), l2 = s2[r2].slot;
    l2 ? o2[l2] = (0, a.h)(f, { name: l2 }, c2) : n2[r2] = c2;
  }
  var d2 = t2 ? (0, a.h)(f, null, n2) : n2;
  return (0, a.h)(t2 || e3.nodeName.toLowerCase(), o2, d2);
}
var v = n(7);
var m = n(78);
function g(e3, t2) {
  for (var n2 in t2) e3[n2] = t2[n2];
  return e3;
}
function y(e3, t2) {
  for (var n2 in e3) if ("__source" !== n2 && !(n2 in t2)) return true;
  for (var o2 in t2) if ("__source" !== o2 && e3[o2] !== t2[o2]) return true;
  return false;
}
m.useLayoutEffect;
function b(e3, t2) {
  this.props = e3, this.context = t2;
}
(b.prototype = new a.Component()).isPureReactComponent = true, b.prototype.shouldComponentUpdate = function(e3, t2) {
  return y(this.props, e3) || y(this.state, t2);
};
var k = a.options.__b;
a.options.__b = function(e3) {
  e3.type && e3.type.__f && e3.ref && (e3.props.ref = e3.ref, e3.ref = null), k && k(e3);
};
var w = "undefined" != typeof Symbol && Symbol.for && /* @__PURE__ */ Symbol.for("react.forward_ref") || 3911;
var S = (a.toChildArray, a.options.__e);
a.options.__e = function(e3, t2, n2, o2) {
  if (e3.then) {
    for (var a2, r2 = t2; r2 = r2.__; ) if ((a2 = r2.__c) && a2.__c) return null == t2.__e && (t2.__e = n2.__e, t2.__k = n2.__k), a2.__c(e3, t2);
  }
  S(e3, t2, n2, o2);
};
var x = a.options.unmount;
function C(e3, t2, n2) {
  return e3 && (e3.__c && e3.__c.__H && (e3.__c.__H.__.forEach(function(e4) {
    "function" == typeof e4.__c && e4.__c();
  }), e3.__c.__H = null), null != (e3 = g({}, e3)).__c && (e3.__c.__P === n2 && (e3.__c.__P = t2), e3.__c.__e = true, e3.__c = null), e3.__k = e3.__k && e3.__k.map(function(e4) {
    return C(e4, t2, n2);
  })), e3;
}
function A(e3, t2, n2) {
  return e3 && n2 && (e3.__v = null, e3.__k = e3.__k && e3.__k.map(function(e4) {
    return A(e4, t2, n2);
  }), e3.__c && e3.__c.__P === t2 && (e3.__e && n2.appendChild(e3.__e), e3.__c.__e = true, e3.__c.__P = n2)), e3;
}
function I() {
  this.__u = 0, this.o = null, this.__b = null;
}
function E(e3) {
  var t2 = e3.__.__c;
  return t2 && t2.__a && t2.__a(e3);
}
function P() {
  this.i = null, this.l = null;
}
a.options.unmount = function(e3) {
  var t2 = e3.__c;
  t2 && t2.__R && t2.__R(), t2 && 32 & e3.__u && (e3.type = null), x && x(e3);
}, (I.prototype = new a.Component()).__c = function(e3, t2) {
  var n2 = t2.__c, o2 = this;
  null == o2.o && (o2.o = []), o2.o.push(n2);
  var a2 = E(o2.__v), r2 = false, i2 = function() {
    r2 || (r2 = true, n2.__R = null, a2 ? a2(s2) : s2());
  };
  n2.__R = i2;
  var s2 = function() {
    if (!--o2.__u) {
      if (o2.state.__a) {
        var e4 = o2.state.__a;
        o2.__v.__k[0] = A(e4, e4.__c.__P, e4.__c.__O);
      }
      var t3;
      for (o2.setState({ __a: o2.__b = null }); t3 = o2.o.pop(); ) t3.forceUpdate();
    }
  };
  o2.__u++ || 32 & t2.__u || o2.setState({ __a: o2.__b = o2.__v.__k[0] }), e3.then(i2, i2);
}, I.prototype.componentWillUnmount = function() {
  this.o = [];
}, I.prototype.render = function(e3, t2) {
  if (this.__b) {
    if (this.__v.__k) {
      var n2 = document.createElement("div"), o2 = this.__v.__k[0].__c;
      this.__v.__k[0] = C(this.__b, n2, o2.__O = o2.__P);
    }
    this.__b = null;
  }
  var r2 = t2.__a && (0, a.createElement)(a.Fragment, null, e3.fallback);
  return r2 && (r2.__u &= -33), [(0, a.createElement)(a.Fragment, null, t2.__a ? null : e3.children), r2];
};
var O = function(e3, t2, n2) {
  if (++n2[1] === n2[0] && e3.l.delete(t2), e3.props.revealOrder && ("t" !== e3.props.revealOrder[0] || !e3.l.size)) for (n2 = e3.i; n2; ) {
    for (; n2.length > 3; ) n2.pop()();
    if (n2[1] < n2[0]) break;
    e3.i = n2 = n2[2];
  }
};
(P.prototype = new a.Component()).__a = function(e3) {
  var t2 = this, n2 = E(t2.__v), o2 = t2.l.get(e3);
  return o2[0]++, function(a2) {
    var r2 = function() {
      t2.props.revealOrder ? (o2.push(a2), O(t2, e3, o2)) : a2();
    };
    n2 ? n2(r2) : r2();
  };
}, P.prototype.render = function(e3) {
  this.i = null, this.l = /* @__PURE__ */ new Map();
  var t2 = (0, a.toChildArray)(e3.children);
  e3.revealOrder && "b" === e3.revealOrder[0] && t2.reverse();
  for (var n2 = t2.length; n2--; ) this.l.set(t2[n2], this.i = [1, 0, this.i]);
  return e3.children;
}, P.prototype.componentDidUpdate = P.prototype.componentDidMount = function() {
  var e3 = this;
  this.l.forEach(function(t2, n2) {
    O(e3, n2, t2);
  });
};
var D = "undefined" != typeof Symbol && Symbol.for && /* @__PURE__ */ Symbol.for("react.element") || 60103;
var T = /^(?:accent|alignment|arabic|baseline|cap|clip(?!PathU)|color|dominant|fill|flood|font|glyph(?!R)|horiz|image(!S)|letter|lighting|marker(?!H|W|U)|overline|paint|pointer|shape|stop|strikethrough|stroke|text(?!L)|transform|underline|unicode|units|v|vector|vert|word|writing|x(?!C))[A-Z]/;
var N = /^on(Ani|Tra|Tou|BeforeInp|Compo)/;
var L = /[A-Z0-9]/g;
var j = "undefined" != typeof document;
var M = function(e3) {
  return ("undefined" != typeof Symbol && "symbol" == typeof /* @__PURE__ */ Symbol() ? /fil|che|rad/ : /fil|che|ra/).test(e3);
};
a.Component.prototype.isReactComponent = {}, ["componentWillMount", "componentWillReceiveProps", "componentWillUpdate"].forEach(function(e3) {
  Object.defineProperty(a.Component.prototype, e3, { configurable: true, get: function() {
    return this["UNSAFE_" + e3];
  }, set: function(t2) {
    Object.defineProperty(this, e3, { configurable: true, writable: true, value: t2 });
  } });
});
var U = a.options.event;
function F() {
}
function W() {
  return this.cancelBubble;
}
function H() {
  return this.defaultPrevented;
}
a.options.event = function(e3) {
  return U && (e3 = U(e3)), e3.persist = F, e3.isPropagationStopped = W, e3.isDefaultPrevented = H, e3.nativeEvent = e3;
};
var R = { enumerable: false, configurable: true, get: function() {
  return this.class;
} };
var q = a.options.vnode;
a.options.vnode = function(e3) {
  "string" == typeof e3.type && (function(e4) {
    var t2 = e4.props, n2 = e4.type, o2 = {}, r2 = -1 === n2.indexOf("-");
    for (var i2 in t2) {
      var s2 = t2[i2];
      if (!("value" === i2 && "defaultValue" in t2 && null == s2 || j && "children" === i2 && "noscript" === n2 || "class" === i2 || "className" === i2)) {
        var c2 = i2.toLowerCase();
        "defaultValue" === i2 && "value" in t2 && null == t2.value ? i2 = "value" : "download" === i2 && true === s2 ? s2 = "" : "translate" === c2 && "no" === s2 ? s2 = false : "o" === c2[0] && "n" === c2[1] ? "ondoubleclick" === c2 ? i2 = "ondblclick" : "onchange" !== c2 || "input" !== n2 && "textarea" !== n2 || M(t2.type) ? "onfocus" === c2 ? i2 = "onfocusin" : "onblur" === c2 ? i2 = "onfocusout" : N.test(i2) && (i2 = c2) : c2 = i2 = "oninput" : r2 && T.test(i2) ? i2 = i2.replace(L, "-$&").toLowerCase() : null === s2 && (s2 = void 0), "oninput" === c2 && o2[i2 = c2] && (i2 = "oninputCapture"), o2[i2] = s2;
      }
    }
    "select" == n2 && o2.multiple && Array.isArray(o2.value) && (o2.value = (0, a.toChildArray)(t2.children).forEach(function(e5) {
      e5.props.selected = -1 != o2.value.indexOf(e5.props.value);
    })), "select" == n2 && null != o2.defaultValue && (o2.value = (0, a.toChildArray)(t2.children).forEach(function(e5) {
      e5.props.selected = o2.multiple ? -1 != o2.defaultValue.indexOf(e5.props.value) : o2.defaultValue == e5.props.value;
    })), t2.class && !t2.className ? (o2.class = t2.class, Object.defineProperty(o2, "className", R)) : (t2.className && !t2.class || t2.class && t2.className) && (o2.class = o2.className = t2.className), e4.props = o2;
  })(e3), e3.$$typeof = D, q && q(e3);
};
var z = a.options.__r;
a.options.__r = function(e3) {
  z && z(e3), e3.__c;
};
var K = a.options.diffed;
function B() {
  return B = Object.assign ? Object.assign.bind() : function(e3) {
    for (var t2 = 1; t2 < arguments.length; t2++) {
      var n2 = arguments[t2];
      for (var o2 in n2) ({}).hasOwnProperty.call(n2, o2) && (e3[o2] = n2[o2]);
    }
    return e3;
  }, B.apply(null, arguments);
}
a.options.diffed = function(e3) {
  K && K(e3);
  var t2 = e3.props, n2 = e3.__e;
  null != n2 && "textarea" === e3.type && "value" in t2 && t2.value !== n2.value && (n2.value = null == t2.value ? "" : t2.value);
}, m.useCallback, m.useContext, m.useDebugValue, m.useEffect, m.useId, m.useImperativeHandle, m.useLayoutEffect, m.useMemo, m.useReducer, m.useRef, m.useState, a.Fragment, m.useState, m.useId, m.useReducer, m.useEffect, m.useLayoutEffect, m.useRef, m.useImperativeHandle, m.useMemo, m.useCallback, m.useContext, m.useDebugValue, a.createElement, a.createContext, a.createRef, a.Fragment, a.Component;
var Z = class {
  static throttle(e3, t2, n2 = {}) {
    const { leading: o2 = true, trailing: a2 = true } = n2;
    let r2, i2, s2, c2 = 0;
    const l2 = () => {
      c2 = false === o2 ? 0 : Date.now(), s2 = null, e3.apply(r2, i2);
    };
    return function(...n3) {
      const d2 = Date.now();
      c2 || false !== o2 || (c2 = d2);
      const u2 = t2 - (d2 - c2);
      r2 = this, i2 = n3, u2 <= 0 || u2 > t2 ? (s2 && (window.clearTimeout(s2), s2 = null), c2 = d2, e3.apply(r2, i2)) : s2 || false === a2 || (s2 = window.setTimeout(l2, u2));
    };
  }
};
var V = "hanko-session-created";
var $ = "hanko-session-expired";
var J = "hanko-user-logged-out";
var Q = "hanko-user-deleted";
var Y = "hanko-after-state-change";
var X = "hanko-before-state-change";
var G = class extends CustomEvent {
  constructor(e3, t2) {
    super(e3, { detail: t2 });
  }
};
var ee = class _ee {
  constructor() {
    this.throttleLimit = 1e3, this._addEventListener = document.addEventListener.bind(document), this._removeEventListener = document.removeEventListener.bind(document), this._throttle = Z.throttle;
  }
  wrapCallback(e3, t2) {
    const n2 = (t3) => {
      e3(t3.detail);
    };
    return t2 ? this._throttle(n2, this.throttleLimit, { leading: true, trailing: false }) : n2;
  }
  addEventListenerWithType({ type: e3, callback: t2, once: n2 = false, throttle: o2 = false }) {
    const a2 = this.wrapCallback(t2, o2);
    return this._addEventListener(e3, a2, { once: n2 }), () => this._removeEventListener(e3, a2);
  }
  static mapAddEventListenerParams(e3, { once: t2, callback: n2 }, o2) {
    return { type: e3, callback: n2, once: t2, throttle: o2 };
  }
  addEventListener(e3, t2, n2) {
    return this.addEventListenerWithType(_ee.mapAddEventListenerParams(e3, t2, n2));
  }
  onSessionCreated(e3, t2) {
    return this.addEventListener(V, { callback: e3, once: t2 }, true);
  }
  onSessionExpired(e3, t2) {
    return this.addEventListener($, { callback: e3, once: t2 }, true);
  }
  onUserLoggedOut(e3, t2) {
    return this.addEventListener(J, { callback: e3, once: t2 });
  }
  onUserDeleted(e3, t2) {
    return this.addEventListener(Q, { callback: e3, once: t2 });
  }
  onAfterStateChange(e3, t2) {
    return this.addEventListener(Y, { callback: e3, once: t2 }, false);
  }
  onBeforeStateChange(e3, t2) {
    return this.addEventListener(X, { callback: e3, once: t2 }, false);
  }
};
var te = class {
  constructor() {
    this._dispatchEvent = document.dispatchEvent.bind(document);
  }
  dispatch(e3, t2) {
    this._dispatchEvent(new G(e3, t2));
  }
  dispatchSessionCreatedEvent(e3) {
    this.dispatch(V, e3);
  }
  dispatchSessionExpiredEvent() {
    this.dispatch($, null);
  }
  dispatchUserLoggedOutEvent() {
    this.dispatch(J, null);
  }
  dispatchUserDeletedEvent() {
    this.dispatch(Q, null);
  }
  dispatchAfterStateChangeEvent(e3) {
    this.dispatch(Y, e3);
  }
  dispatchBeforeStateChangeEvent(e3) {
    this.dispatch(X, e3);
  }
};
var ne = class _ne extends Error {
  constructor(e3, t2, n2) {
    super(e3), this.code = void 0, this.cause = void 0, this.code = t2, this.cause = n2, Object.setPrototypeOf(this, _ne.prototype);
  }
};
var oe = class _oe extends ne {
  constructor(e3) {
    super("Technical error", "somethingWentWrong", e3), Object.setPrototypeOf(this, _oe.prototype);
  }
};
var re = class _re extends ne {
  constructor(e3) {
    super("Request timed out error", "requestTimeout", e3), Object.setPrototypeOf(this, _re.prototype);
  }
};
var fe = class _fe extends ne {
  constructor(e3) {
    super("Unauthorized error", "unauthorized", e3), Object.setPrototypeOf(this, _fe.prototype);
  }
};
function be(e3) {
  for (var t2 = 1; t2 < arguments.length; t2++) {
    var n2 = arguments[t2];
    for (var o2 in n2) e3[o2] = n2[o2];
  }
  return e3;
}
var ke = (function e2(t2, n2) {
  function o2(e3, o3, a2) {
    if ("undefined" != typeof document) {
      "number" == typeof (a2 = be({}, n2, a2)).expires && (a2.expires = new Date(Date.now() + 864e5 * a2.expires)), a2.expires && (a2.expires = a2.expires.toUTCString()), e3 = encodeURIComponent(e3).replace(/%(2[346B]|5E|60|7C)/g, decodeURIComponent).replace(/[()]/g, escape);
      var r2 = "";
      for (var i2 in a2) a2[i2] && (r2 += "; " + i2, true !== a2[i2] && (r2 += "=" + a2[i2].split(";")[0]));
      return document.cookie = e3 + "=" + t2.write(o3, e3) + r2;
    }
  }
  return Object.create({ set: o2, get: function(e3) {
    if ("undefined" != typeof document && (!arguments.length || e3)) {
      for (var n3 = document.cookie ? document.cookie.split("; ") : [], o3 = {}, a2 = 0; a2 < n3.length; a2++) {
        var r2 = n3[a2].split("="), i2 = r2.slice(1).join("=");
        try {
          var s2 = decodeURIComponent(r2[0]);
          if (o3[s2] = t2.read(i2, s2), e3 === s2) break;
        } catch (e4) {
        }
      }
      return e3 ? o3[e3] : o3;
    }
  }, remove: function(e3, t3) {
    o2(e3, "", be({}, t3, { expires: -1 }));
  }, withAttributes: function(t3) {
    return e2(this.converter, be({}, this.attributes, t3));
  }, withConverter: function(t3) {
    return e2(be({}, this.converter, t3), this.attributes);
  } }, { attributes: { value: Object.freeze(n2) }, converter: { value: Object.freeze(t2) } });
})({ read: function(e3) {
  return '"' === e3[0] && (e3 = e3.slice(1, -1)), e3.replace(/(%[\dA-F]{2})+/gi, decodeURIComponent);
}, write: function(e3) {
  return encodeURIComponent(e3).replace(/%(2[346BF]|3[AC-F]|40|5[BDE]|60|7[BCD])/g, decodeURIComponent);
} }, { path: "/" });
var we = class {
  constructor(e3) {
    var t2, n2;
    this.authCookieName = void 0, this.authCookieDomain = void 0, this.authCookieSameSite = void 0, this.authCookieName = null != (t2 = e3.cookieName) ? t2 : "hanko", this.authCookieDomain = e3.cookieDomain, this.authCookieSameSite = null != (n2 = e3.cookieSameSite) ? n2 : "lax";
  }
  getAuthCookie() {
    return ke.get(this.authCookieName);
  }
  setAuthCookie(e3, t2) {
    const n2 = { secure: true, sameSite: this.authCookieSameSite };
    void 0 !== this.authCookieDomain && (n2.domain = this.authCookieDomain);
    const o2 = B({}, n2, t2);
    if (("none" === o2.sameSite || "None" === o2.sameSite) && false === o2.secure) throw new oe(new Error("Secure attribute must be set when SameSite=None"));
    ke.set(this.authCookieName, e3, o2);
  }
  removeAuthCookie() {
    ke.remove(this.authCookieName);
  }
};
var Se = class {
  constructor(e3) {
    this.keyName = void 0, this.keyName = e3.keyName;
  }
  getSessionToken() {
    return sessionStorage.getItem(this.keyName);
  }
  setSessionToken(e3) {
    sessionStorage.setItem(this.keyName, e3);
  }
  removeSessionToken() {
    sessionStorage.removeItem(this.keyName);
  }
};
var xe = class {
  constructor(e3) {
    this._xhr = void 0, this._xhr = e3;
  }
  getResponseHeader(e3) {
    return this._xhr.getResponseHeader(e3);
  }
};
var Ce = class {
  constructor(e3) {
    this.headers = void 0, this.ok = void 0, this.status = void 0, this.statusText = void 0, this.url = void 0, this._decodedJSON = void 0, this.xhr = void 0, this.headers = new xe(e3), this.ok = e3.status >= 200 && e3.status <= 299, this.status = e3.status, this.statusText = e3.statusText, this.url = e3.responseURL, this.xhr = e3;
  }
  json() {
    return this._decodedJSON || (this._decodedJSON = JSON.parse(this.xhr.response)), this._decodedJSON;
  }
  parseNumericHeader(e3) {
    const t2 = parseInt(this.headers.getResponseHeader(e3), 10);
    return isNaN(t2) ? 0 : t2;
  }
};
var Ae = class {
  constructor(e3, t2) {
    var n2;
    this.timeout = void 0, this.api = void 0, this.dispatcher = void 0, this.cookie = void 0, this.sessionTokenStorage = void 0, this.lang = void 0, this.sessionTokenLocation = void 0, this.api = e3, this.timeout = null != (n2 = t2.timeout) ? n2 : 13e3, this.dispatcher = new te(), this.cookie = new we(B({}, t2)), this.sessionTokenStorage = new Se({ keyName: t2.cookieName }), this.lang = t2.lang, this.sessionTokenLocation = t2.sessionTokenLocation;
  }
  _fetch(e3, t2, n2 = new XMLHttpRequest()) {
    const o2 = this, a2 = this.api + e3, r2 = this.timeout, i2 = this.getAuthToken(), s2 = this.lang;
    return new Promise(function(e4, c2) {
      n2.open(t2.method, a2, true), n2.setRequestHeader("Accept", "application/json"), n2.setRequestHeader("Content-Type", "application/json"), n2.setRequestHeader("X-Language", s2), i2 && n2.setRequestHeader("Authorization", `Bearer ${i2}`), n2.timeout = r2, n2.withCredentials = true, n2.onload = () => {
        o2.processHeaders(n2), e4(new Ce(n2));
      }, n2.onerror = () => {
        c2(new oe());
      }, n2.ontimeout = () => {
        c2(new re());
      }, n2.send(t2.body ? t2.body.toString() : null);
    });
  }
  processHeaders(e3) {
    let t2 = "", n2 = 0, o2 = "";
    if (e3.getAllResponseHeaders().split("\r\n").forEach((a2) => {
      const r2 = a2.toLowerCase();
      r2.startsWith("x-auth-token") ? t2 = e3.getResponseHeader("X-Auth-Token") : r2.startsWith("x-session-lifetime") ? n2 = parseInt(e3.getResponseHeader("X-Session-Lifetime"), 10) : r2.startsWith("x-session-retention") && (o2 = e3.getResponseHeader("X-Session-Retention"));
    }), t2) {
      const e4 = new RegExp("^https://"), a2 = !!this.api.match(e4) && !!window.location.href.match(e4), r2 = "session" === o2 ? void 0 : new Date((/* @__PURE__ */ new Date()).getTime() + 1e3 * n2);
      this.setAuthToken(t2, { secure: a2, expires: r2 });
    }
  }
  get(e3) {
    return this._fetch(e3, { method: "GET" });
  }
  post(e3, t2) {
    return this._fetch(e3, { method: "POST", body: JSON.stringify(t2) });
  }
  put(e3, t2) {
    return this._fetch(e3, { method: "PUT", body: JSON.stringify(t2) });
  }
  patch(e3, t2) {
    return this._fetch(e3, { method: "PATCH", body: JSON.stringify(t2) });
  }
  delete(e3) {
    return this._fetch(e3, { method: "DELETE" });
  }
  getAuthToken() {
    let e3 = "";
    switch (this.sessionTokenLocation) {
      case "cookie":
      default:
        e3 = this.cookie.getAuthCookie();
        break;
      case "sessionStorage":
        e3 = this.sessionTokenStorage.getSessionToken();
    }
    return e3;
  }
  setAuthToken(e3, t2) {
    switch (this.sessionTokenLocation) {
      case "cookie":
      default:
        return this.cookie.setAuthCookie(e3, t2);
      case "sessionStorage":
        return this.sessionTokenStorage.setSessionToken(e3);
    }
  }
};
var Ie = class {
  constructor(e3, t2) {
    this.client = void 0, this.client = new Ae(e3, t2);
  }
};
var Ee = class extends Ie {
  async validate() {
    const e3 = await this.client.get("/sessions/validate");
    if (!e3.ok) throw new oe();
    return await e3.json();
  }
};
var Pe = class {
  constructor(e3) {
    this.storageKey = void 0, this.defaultState = { expiration: 0, lastCheck: 0 }, this.storageKey = e3;
  }
  load() {
    const e3 = window.localStorage.getItem(this.storageKey);
    return null == e3 ? this.defaultState : JSON.parse(e3);
  }
  save(e3) {
    window.localStorage.setItem(this.storageKey, JSON.stringify(e3 || this.defaultState));
  }
};
var Oe = class {
  constructor(e3, t2) {
    this.onActivityCallback = void 0, this.onInactivityCallback = void 0, this.handleFocus = () => {
      this.onActivityCallback();
    }, this.handleBlur = () => {
      this.onInactivityCallback();
    }, this.handleVisibilityChange = () => {
      "visible" === document.visibilityState ? this.onActivityCallback() : this.onInactivityCallback();
    }, this.hasFocus = () => document.hasFocus(), this.onActivityCallback = e3, this.onInactivityCallback = t2, window.addEventListener("focus", this.handleFocus), window.addEventListener("blur", this.handleBlur), document.addEventListener("visibilitychange", this.handleVisibilityChange);
  }
};
var De = class {
  constructor(e3, t2, n2) {
    this.intervalID = null, this.timeoutID = null, this.checkInterval = void 0, this.checkSession = void 0, this.onSessionExpired = void 0, this.checkInterval = e3, this.checkSession = t2, this.onSessionExpired = n2;
  }
  scheduleSessionExpiry(e3) {
    var t2 = this;
    this.stop(), this.timeoutID = setTimeout(async function() {
      t2.stop(), t2.onSessionExpired();
    }, e3);
  }
  start(e3 = 0, t2 = 0) {
    var n2 = this;
    const o2 = this.calcTimeToNextCheck(e3);
    this.sessionExpiresSoon(t2) ? this.scheduleSessionExpiry(o2) : this.timeoutID = setTimeout(async function() {
      try {
        let e4 = await n2.checkSession();
        if (e4.is_valid) {
          if (n2.sessionExpiresSoon(e4.expiration)) return void n2.scheduleSessionExpiry(e4.expiration - Date.now());
          n2.intervalID = setInterval(async function() {
            e4 = await n2.checkSession(), e4.is_valid ? n2.sessionExpiresSoon(e4.expiration) && n2.scheduleSessionExpiry(e4.expiration - Date.now()) : n2.stop();
          }, n2.checkInterval);
        } else n2.stop();
      } catch (e4) {
        console.log(e4);
      }
    }, o2);
  }
  stop() {
    this.timeoutID && (clearTimeout(this.timeoutID), this.timeoutID = null), this.intervalID && (clearInterval(this.intervalID), this.intervalID = null);
  }
  isRunning() {
    return null !== this.timeoutID || null !== this.intervalID;
  }
  sessionExpiresSoon(e3) {
    return e3 > 0 && e3 - Date.now() <= this.checkInterval;
  }
  calcTimeToNextCheck(e3) {
    const t2 = Date.now() - e3;
    return this.checkInterval >= t2 ? this.checkInterval - t2 % this.checkInterval : 0;
  }
};
var Te = class {
  constructor(e3 = "hanko_session", t2, n2, o2) {
    this.channel = void 0, this.onSessionExpired = void 0, this.onSessionCreated = void 0, this.onLeadershipRequested = void 0, this.handleMessage = (e4) => {
      const t3 = e4.data;
      switch (t3.action) {
        case "sessionExpired":
          this.onSessionExpired(t3);
          break;
        case "sessionCreated":
          this.onSessionCreated(t3);
          break;
        case "requestLeadership":
          this.onLeadershipRequested(t3);
      }
    }, this.onSessionExpired = t2, this.onSessionCreated = n2, this.onLeadershipRequested = o2, this.channel = new BroadcastChannel(e3), this.channel.onmessage = this.handleMessage;
  }
  post(e3) {
    this.channel.postMessage(e3);
  }
};
var Ne = class extends te {
  constructor(e3, t2) {
    super(), this.listener = new ee(), this.checkInterval = 3e4, this.client = void 0, this.sessionState = void 0, this.windowActivityManager = void 0, this.scheduler = void 0, this.sessionChannel = void 0, this.isLoggedIn = void 0, this.client = new Ee(e3, t2), t2.sessionCheckInterval && (this.checkInterval = t2.sessionCheckInterval < 3e3 ? 3e3 : t2.sessionCheckInterval), this.sessionState = new Pe(`${t2.cookieName}_session_state`), this.sessionChannel = new Te(this.getSessionCheckChannelName(t2.sessionTokenLocation, t2.sessionCheckChannelName), () => this.onChannelSessionExpired(), (e4) => this.onChannelSessionCreated(e4), () => this.onChannelLeadershipRequested()), this.scheduler = new De(this.checkInterval, () => this.checkSession(), () => this.onSessionExpired()), this.windowActivityManager = new Oe(() => this.startSessionCheck(), () => this.scheduler.stop());
    const n2 = Date.now(), { expiration: o2 } = this.sessionState.load();
    this.isLoggedIn = n2 < o2, this.initializeEventListeners(), this.startSessionCheck();
  }
  initializeEventListeners() {
    this.listener.onSessionCreated((e3) => {
      const { claims: t2 } = e3, n2 = Date.parse(t2.expiration), o2 = Date.now();
      this.isLoggedIn = true, this.sessionState.save({ expiration: n2, lastCheck: o2 }), this.sessionChannel.post({ action: "sessionCreated", claims: t2 }), this.startSessionCheck();
    }), this.listener.onUserLoggedOut(() => {
      this.isLoggedIn = false, this.sessionChannel.post({ action: "sessionExpired" }), this.sessionState.save(null), this.scheduler.stop();
    }), window.addEventListener("beforeunload", () => this.scheduler.stop());
  }
  startSessionCheck() {
    if (!this.windowActivityManager.hasFocus()) return;
    if (this.sessionChannel.post({ action: "requestLeadership" }), this.scheduler.isRunning()) return;
    const { lastCheck: e3, expiration: t2 } = this.sessionState.load();
    this.isLoggedIn && this.scheduler.start(e3, t2);
  }
  async checkSession() {
    const e3 = Date.now(), { is_valid: t2, claims: n2, expiration_time: o2 } = await this.client.validate(), a2 = o2 ? Date.parse(o2) : 0;
    return !t2 && this.isLoggedIn && this.dispatchSessionExpiredEvent(), t2 ? (this.isLoggedIn = true, this.sessionState.save({ lastCheck: e3, expiration: a2 })) : (this.isLoggedIn = false, this.sessionState.save(null), this.sessionChannel.post({ action: "sessionExpired" })), { is_valid: t2, claims: n2, expiration: a2 };
  }
  onSessionExpired() {
    this.isLoggedIn && (this.isLoggedIn = false, this.sessionState.save(null), this.sessionChannel.post({ action: "sessionExpired" }), this.dispatchSessionExpiredEvent());
  }
  onChannelSessionExpired() {
    this.isLoggedIn && (this.isLoggedIn = false, this.dispatchSessionExpiredEvent());
  }
  onChannelSessionCreated(e3) {
    const { claims: t2 } = e3, n2 = Date.now(), o2 = Date.parse(t2.expiration) - n2;
    this.isLoggedIn = true, this.dispatchSessionCreatedEvent({ claims: t2, expirationSeconds: o2 });
  }
  onChannelLeadershipRequested() {
    this.windowActivityManager.hasFocus() || this.scheduler.stop();
  }
  getSessionCheckChannelName(e3, t2) {
    if ("sessionStorage" !== e3) return t2;
    let n2 = sessionStorage.getItem("sessionCheckChannelName");
    return null != n2 && "" !== n2 || (n2 = `${t2}-${Math.floor(100 * Math.random()) + 1}`, sessionStorage.setItem("sessionCheckChannelName", n2)), n2;
  }
};
var Le = class {
  static supported() {
    return !!(navigator.credentials && navigator.credentials.create && navigator.credentials.get && window.PublicKeyCredential);
  }
  static async isPlatformAuthenticatorAvailable() {
    return !(!this.supported() || !window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) && window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  }
  static async isSecurityKeySupported() {
    return void 0 !== window.PublicKeyCredential && window.PublicKeyCredential.isExternalCTAP2SecurityKeySupported ? window.PublicKeyCredential.isExternalCTAP2SecurityKeySupported() : this.supported();
  }
  static async isConditionalMediationAvailable() {
    return !(!window.PublicKeyCredential || !window.PublicKeyCredential.isConditionalMediationAvailable) && window.PublicKeyCredential.isConditionalMediationAvailable();
  }
};
function je(e3) {
  const t2 = "==".slice(0, (4 - e3.length % 4) % 4), n2 = e3.replace(/-/g, "+").replace(/_/g, "/") + t2, o2 = atob(n2), a2 = new ArrayBuffer(o2.length), r2 = new Uint8Array(a2);
  for (let e4 = 0; e4 < o2.length; e4++) r2[e4] = o2.charCodeAt(e4);
  return a2;
}
function Me(e3) {
  const t2 = new Uint8Array(e3);
  let n2 = "";
  for (const e4 of t2) n2 += String.fromCharCode(e4);
  return btoa(n2).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
var Ue = "copy";
var Fe = "convert";
function We(e3, t2, n2) {
  if (t2 === Ue) return n2;
  if (t2 === Fe) return e3(n2);
  if (t2 instanceof Array) return n2.map((n3) => We(e3, t2[0], n3));
  if (t2 instanceof Object) {
    const o2 = {};
    for (const [a2, r2] of Object.entries(t2)) {
      if (r2.derive) {
        const e4 = r2.derive(n2);
        void 0 !== e4 && (n2[a2] = e4);
      }
      if (a2 in n2) o2[a2] = null != n2[a2] ? We(e3, r2.schema, n2[a2]) : null;
      else if (r2.required) throw new Error(`Missing key: ${a2}`);
    }
    return o2;
  }
}
function He(e3, t2) {
  return { required: true, schema: e3, derive: t2 };
}
function Re(e3) {
  return { required: true, schema: e3 };
}
function qe(e3) {
  return { required: false, schema: e3 };
}
var ze = { type: Re(Ue), id: Re(Fe), transports: qe(Ue) };
var Ke = { appid: qe(Ue), appidExclude: qe(Ue), credProps: qe(Ue) };
var Be = { appid: qe(Ue), appidExclude: qe(Ue), credProps: qe(Ue) };
var Ze = { publicKey: Re({ rp: Re(Ue), user: Re({ id: Re(Fe), name: Re(Ue), displayName: Re(Ue) }), challenge: Re(Fe), pubKeyCredParams: Re(Ue), timeout: qe(Ue), excludeCredentials: qe([ze]), authenticatorSelection: qe(Ue), attestation: qe(Ue), extensions: qe(Ke) }), signal: qe(Ue) };
var Ve = { type: Re(Ue), id: Re(Ue), rawId: Re(Fe), authenticatorAttachment: qe(Ue), response: Re({ clientDataJSON: Re(Fe), attestationObject: Re(Fe), transports: He(Ue, (e3) => {
  var t2;
  return (null == (t2 = e3.getTransports) ? void 0 : t2.call(e3)) || [];
}) }), clientExtensionResults: He(Be, (e3) => e3.getClientExtensionResults()) };
var $e = { mediation: qe(Ue), publicKey: Re({ challenge: Re(Fe), timeout: qe(Ue), rpId: qe(Ue), allowCredentials: qe([ze]), userVerification: qe(Ue), extensions: qe(Ke) }), signal: qe(Ue) };
var Je = { type: Re(Ue), id: Re(Ue), rawId: Re(Fe), authenticatorAttachment: qe(Ue), response: Re({ clientDataJSON: Re(Fe), authenticatorData: Re(Fe), signature: Re(Fe), userHandle: Re(Fe) }), clientExtensionResults: He(Be, (e3) => e3.getClientExtensionResults()) };
async function Qe(e3) {
  const t2 = await navigator.credentials.get((function(e4) {
    return We(je, $e, e4);
  })(e3));
  return (function(e4) {
    return We(Me, Je, e4);
  })(t2);
}
var Ye = class _Ye {
  constructor() {
    this.abortController = new AbortController();
  }
  static getInstance() {
    return _Ye.instance || (_Ye.instance = new _Ye()), _Ye.instance;
  }
  createAbortSignal() {
    return this.abortController.abort(), this.abortController = new AbortController(), this.abortController.signal;
  }
  async getWebauthnCredential(e3) {
    return await Qe(B({}, e3, { signal: this.createAbortSignal() }));
  }
  async getConditionalWebauthnCredential(e3) {
    return await Qe({ publicKey: e3, mediation: "conditional", signal: this.createAbortSignal() });
  }
  async createWebauthnCredential(e3) {
    return await (async function(e4) {
      return t2 = await navigator.credentials.create((function(e5) {
        return We(je, Ze, e5);
      })(e4)), We(Me, Ve, t2);
      var t2;
    })(B({}, e3, { signal: this.createAbortSignal() }));
  }
};
Ye.instance = null;
var Xe = "hanko_pkce_code_verifier";
var Ge = () => {
  let e3 = "";
  const t2 = new Uint8Array(1);
  for (; e3.length < 64; ) {
    window.crypto.getRandomValues(t2);
    const n2 = t2[0];
    n2 < 198 && (e3 += "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~".charAt(n2 % 66));
  }
  return e3;
};
var et = (e3) => {
  "undefined" != typeof window && window.sessionStorage && window.sessionStorage.setItem(Xe, e3);
};
var tt = () => "undefined" != typeof window && window.sessionStorage ? window.sessionStorage.getItem(Xe) : null;
var nt = () => {
  "undefined" != typeof window && window.sessionStorage && window.sessionStorage.removeItem(Xe);
};
async function ot(e3, t2, n2, o2 = "webauthn_credential_already_exists", a2 = "Webauthn credential already exists") {
  try {
    const o3 = await t2.createWebauthnCredential(n2);
    return await e3.actions.webauthn_verify_attestation_response.run({ public_key: o3 });
  } catch (t3) {
    const n3 = await e3.actions.back.run();
    return n3.error = { code: o2, message: a2 }, n3;
  }
}
var at = { preflight: async (e3) => await e3.actions.register_client_capabilities.run({ webauthn_available: Le.supported(), webauthn_conditional_mediation_available: await Le.isConditionalMediationAvailable(), webauthn_platform_authenticator_available: await Le.isPlatformAuthenticatorAvailable() }), login_passkey: async (e3) => {
  const t2 = Ye.getInstance();
  try {
    const n2 = await t2.getWebauthnCredential(e3.payload.request_options);
    return await e3.actions.webauthn_verify_assertion_response.run({ assertion_response: n2 });
  } catch (t3) {
    const n2 = await e3.actions.back.run();
    return e3.error && (n2.error = e3.error), n2;
  }
}, onboarding_verify_passkey_attestation: async (e3) => ot(e3, Ye.getInstance(), e3.payload.creation_options), webauthn_credential_verification: async (e3) => ot(e3, Ye.getInstance(), e3.payload.creation_options), async thirdparty(e3) {
  const t2 = new URLSearchParams(window.location.search), n2 = t2.get("hanko_token"), o2 = t2.get("error"), a2 = (e4) => {
    e4.forEach((e5) => t2.delete(e5));
    const n3 = t2.toString() ? `?${t2.toString()}` : "";
    history.replaceState(null, null, `${window.location.pathname}${n3}`);
  };
  if ((null == n2 ? void 0 : n2.length) > 0) {
    a2(["hanko_token"]);
    const t3 = tt();
    try {
      return await e3.actions.exchange_token.run({ token: n2, code_verifier: t3 || void 0 });
    } finally {
      nt();
    }
  }
  if ((null == o2 ? void 0 : o2.length) > 0) {
    const n3 = "access_denied" === o2 ? "third_party_access_denied" : "technical_error", r2 = t2.get("error_description");
    a2(["error", "error_description"]);
    const i2 = await e3.actions.back.run(null, { dispatchAfterStateChangeEvent: false });
    return i2.error = { code: n3, message: r2 }, i2.dispatchAfterStateChangeEvent(), i2;
  }
  return e3.isCached ? await e3.actions.back.run() : (e3.saveToLocalStorage(), window.location.assign(e3.payload.redirect_url), e3);
}, success: async (e3) => {
  const { claims: t2 } = e3.payload, n2 = Date.parse(t2.expiration) - Date.now();
  return e3.removeFromLocalStorage(), e3.hanko.relay.dispatchSessionCreatedEvent({ claims: t2, expirationSeconds: n2 }), e3;
}, account_deleted: async (e3) => (e3.removeFromLocalStorage(), e3.hanko.relay.dispatchUserDeletedEvent(), e3) };
var rt = { login_init: async (e3) => {
  !(async function() {
    const t2 = Ye.getInstance();
    if (e3.payload.request_options) try {
      const { publicKey: n2 } = e3.payload.request_options, o2 = await t2.getConditionalWebauthnCredential(n2);
      return await e3.actions.webauthn_verify_assertion_response.run({ assertion_response: o2 });
    } catch (e4) {
      return;
    }
  })();
} };
var it = class _it {
  constructor(e3, t2, n2, o2 = {}) {
    if (this.name = void 0, this.flowName = void 0, this.error = void 0, this.payload = void 0, this.actions = void 0, this.csrfToken = void 0, this.status = void 0, this.previousAction = void 0, this.isCached = void 0, this.cacheKey = void 0, this.hanko = void 0, this.invokedAction = void 0, this.excludeAutoSteps = void 0, this.autoStep = void 0, this.passkeyAutofillActivation = void 0, this.flowName = t2, this.name = n2.name, this.error = n2.error, this.payload = n2.payload, this.csrfToken = n2.csrf_token, this.status = n2.status, this.hanko = e3, this.actions = this.buildActionMap(n2.actions), this.name in at) {
      const e4 = at[this.name];
      this.autoStep = () => e4(this);
    }
    if (this.name in rt) {
      const e4 = rt[this.name];
      this.passkeyAutofillActivation = () => e4(this);
    }
    const { dispatchAfterStateChangeEvent: a2 = true, excludeAutoSteps: r2 = null, previousAction: i2 = null, isCached: s2 = false, cacheKey: c2 = "hanko-flow-state" } = o2;
    this.excludeAutoSteps = r2, this.previousAction = i2, this.isCached = s2, this.cacheKey = c2, a2 && this.dispatchAfterStateChangeEvent();
  }
  buildActionMap(e3) {
    const t2 = {};
    return Object.keys(e3).forEach((n2) => {
      t2[n2] = new st(e3[n2], this);
    }), new Proxy(t2, { get: (e4, t3) => {
      if (t3 in e4) return e4[t3];
      const n2 = "string" == typeof t3 ? t3 : t3.toString();
      return st.createDisabled(n2, this);
    } });
  }
  dispatchAfterStateChangeEvent() {
    this.hanko.relay.dispatchAfterStateChangeEvent({ state: this });
  }
  serialize() {
    return { flow_name: this.flowName, name: this.name, error: this.error, payload: this.payload, csrf_token: this.csrfToken, status: this.status, previous_action: this.previousAction, actions: Object.fromEntries(Object.entries(this.actions).map(([e3, t2]) => [e3, { action: t2.name, href: t2.href, inputs: t2.inputs, description: null }])) };
  }
  saveToLocalStorage() {
    localStorage.setItem(this.cacheKey, JSON.stringify(B({}, this.serialize(), { is_cached: true })));
  }
  removeFromLocalStorage() {
    localStorage.removeItem(this.cacheKey);
  }
  static async initializeFlowState(e3, t2, n2, o2 = {}) {
    let a2 = new _it(e3, t2, n2, o2);
    if ("all" != a2.excludeAutoSteps) for (; a2 && a2.autoStep && (null == (r2 = a2.excludeAutoSteps) || !r2.includes(a2.name)); ) {
      var r2;
      const e4 = await a2.autoStep();
      if (e4.name == a2.name) return e4;
      a2 = e4;
    }
    return a2;
  }
  static readFromLocalStorage(e3) {
    const t2 = localStorage.getItem(e3);
    if (t2) try {
      return JSON.parse(t2);
    } catch (e4) {
      return;
    }
  }
  static async create(e3, t2, n2 = {}) {
    const { cacheKey: o2 = "hanko-flow-state", loadFromCache: a2 = true } = n2;
    if (a2) {
      const t3 = _it.readFromLocalStorage(o2);
      if (t3) return _it.deserialize(e3, t3, B({}, n2, { cacheKey: o2 }));
    }
    const r2 = await _it.fetchState(e3, `/${t2}`);
    return _it.initializeFlowState(e3, t2, r2, B({}, n2, { cacheKey: o2 }));
  }
  static async deserialize(e3, t2, n2 = {}) {
    return _it.initializeFlowState(e3, t2.flow_name, t2, B({}, n2, { previousAction: t2.previous_action, isCached: t2.is_cached }));
  }
  static async fetchState(e3, t2, n2) {
    try {
      return (await e3.client.post(t2, n2)).json();
    } catch (e4) {
      return _it.createErrorResponse(e4);
    }
  }
  static createErrorResponse(e3) {
    return { actions: null, csrf_token: "", name: "error", payload: null, status: 0, error: e3 };
  }
};
var st = class _st {
  constructor(e3, t2, n2 = true) {
    this.enabled = void 0, this.href = void 0, this.name = void 0, this.inputs = void 0, this.parentState = void 0, this.enabled = n2, this.href = e3.href, this.name = e3.action, this.inputs = e3.inputs, this.parentState = t2;
  }
  static createDisabled(e3, t2) {
    return new _st({ action: e3, href: "", inputs: {}, description: "Disabled action" }, t2, false);
  }
  async run(e3 = null, t2 = {}) {
    const { name: n2, hanko: o2, flowName: a2, csrfToken: r2, invokedAction: i2, excludeAutoSteps: s2, cacheKey: c2 } = this.parentState, { dispatchAfterStateChangeEvent: l2 = true } = t2;
    if (!this.enabled) throw new Error(`Action '${this.name}' is not enabled in state '${n2}'`);
    if (i2) throw new Error(`An action '${i2.name}' has already been invoked on state '${i2.relatedStateName}'. No further actions can be run.`);
    this.parentState.invokedAction = { name: this.name, relatedStateName: n2 }, o2.relay.dispatchBeforeStateChangeEvent({ state: this.parentState });
    const d2 = { input_data: B({}, Object.keys(this.inputs).reduce((e4, t3) => {
      const n3 = this.inputs[t3];
      return void 0 !== n3.value && (e4[t3] = n3.value), e4;
    }, {}), e3), csrf_token: r2 }, u2 = await it.fetchState(o2, this.href, d2);
    return this.parentState.removeFromLocalStorage(), it.initializeFlowState(o2, a2, u2, { dispatchAfterStateChangeEvent: l2, excludeAutoSteps: s2, previousAction: i2, cacheKey: c2 });
  }
};
var ct = class extends Ie {
  async getCurrent() {
    const e3 = await this.client.get("/me");
    if (401 === e3.status) throw this.client.dispatcher.dispatchSessionExpiredEvent(), new fe();
    if (!e3.ok) throw new oe();
    const t2 = e3.json(), n2 = await this.client.get(`/users/${t2.id}`);
    if (401 === n2.status) throw this.client.dispatcher.dispatchSessionExpiredEvent(), new fe();
    if (!n2.ok) throw new oe();
    return n2.json();
  }
  async getCurrentUser() {
    const e3 = await this.client.get("/me");
    if (401 === e3.status) throw this.client.dispatcher.dispatchSessionExpiredEvent(), new fe();
    if (!e3.ok) throw new oe();
    return e3.json();
  }
  async logout() {
    const e3 = await this.client.post("/logout");
    if (this.client.sessionTokenStorage.removeSessionToken(), this.client.cookie.removeAuthCookie(), this.client.dispatcher.dispatchUserLoggedOutEvent(), 401 !== e3.status && !e3.ok) throw new oe();
  }
};
var lt = class extends ee {
  constructor(e3, t2) {
    super(), this.session = void 0, this.user = void 0, this.cookie = void 0, this.client = void 0, this.relay = void 0;
    const n2 = B({ timeout: 13e3, cookieName: "hanko", localStorageKey: "hanko", sessionCheckInterval: 3e4, sessionCheckChannelName: "hanko-session-check" }, t2);
    this.client = new Ae(e3, n2), this.session = new Ee(e3, n2), this.user = new ct(e3, n2), this.relay = new Ne(e3, n2), this.cookie = new we(n2);
  }
  setLang(e3) {
    this.client.lang = e3;
  }
  createState(e3, t2 = {}) {
    return it.create(this, e3, t2);
  }
  async getUser() {
    return this.user.getCurrent();
  }
  async getCurrentUser() {
    return this.user.getCurrentUser();
  }
  async validateSession() {
    return this.session.validate();
  }
  getSessionToken() {
    return this.cookie.getAuthCookie();
  }
  async logout() {
    return this.user.logout();
  }
};
var dt = n(292);
var ut = n.n(dt);
var ht = n(360);
var pt = n.n(ht);
var ft = n(884);
var _t = n.n(ft);
var vt = n(88);
var mt = n.n(vt);
var gt = n(890);
var yt = {};
yt.setAttributes = _t(), yt.insert = (e3) => {
  window._hankoStyle = e3;
}, yt.domAPI = pt(), yt.insertStyleElement = mt(), ut()(gt.A, yt);
var bt = gt.A && gt.A.locals ? gt.A.locals : void 0;
var kt = (function(e3) {
  function t2(t3) {
    var n2 = g({}, t3);
    return delete n2.ref, e3(n2, t3.ref || null);
  }
  return t2.$$typeof = w, t2.render = e3, t2.prototype.isReactComponent = t2.__f = true, t2.displayName = "ForwardRef(" + (e3.displayName || e3.name) + ")", t2;
})((e3, t2) => {
  const { lang: n2, hanko: o2, setHanko: a2 } = (0, m.useContext)(Uo), { setLang: r2 } = (0, m.useContext)(v.TranslateContext);
  return (0, m.useEffect)(() => {
    r2(n2.replace(/[-]/, "")), a2((e4) => (e4.setLang(n2), e4));
  }, [o2, n2, a2, r2]), i("section", { part: "container", className: bt.container, ref: t2, children: e3.children });
});
var wt = n(313);
var St = {};
St.setAttributes = _t(), St.insert = (e3) => {
  window._hankoStyle = e3;
}, St.domAPI = pt(), St.insertStyleElement = mt(), ut()(wt.A, St);
var xt = wt.A && wt.A.locals ? wt.A.locals : void 0;
var Ct = n(452);
var At = n.n(Ct);
var It = ({ size: e3, secondary: t2, disabled: n2 }) => i("svg", { id: "icon-apple", xmlns: "http://www.w3.org/2000/svg", width: e3, height: e3, viewBox: "20.5 16 15 19", className: At()(xt.icon, t2 && xt.secondary, n2 && xt.disabled), children: i("path", { d: "M28.2226562,20.3846154 C29.0546875,20.3846154 30.0976562,19.8048315 30.71875,19.0317864 C31.28125,18.3312142 31.6914062,17.352829 31.6914062,16.3744437 C31.6914062,16.2415766 31.6796875,16.1087095 31.65625,16 C30.7304687,16.0362365 29.6171875,16.640178 28.9492187,17.4494596 C28.421875,18.06548 27.9414062,19.0317864 27.9414062,20.0222505 C27.9414062,20.1671964 27.9648438,20.3121424 27.9765625,20.3604577 C28.0351562,20.3725366 28.1289062,20.3846154 28.2226562,20.3846154 Z M25.2929688,35 C26.4296875,35 26.9335938,34.214876 28.3515625,34.214876 C29.7929688,34.214876 30.109375,34.9758423 31.375,34.9758423 C32.6171875,34.9758423 33.4492188,33.792117 34.234375,32.6325493 C35.1132812,31.3038779 35.4765625,29.9993643 35.5,29.9389701 C35.4179688,29.9148125 33.0390625,28.9122695 33.0390625,26.0979021 C33.0390625,23.6579784 34.9140625,22.5588048 35.0195312,22.474253 C33.7773438,20.6382708 31.890625,20.5899555 31.375,20.5899555 C29.9804688,20.5899555 28.84375,21.4596313 28.1289062,21.4596313 C27.3554688,21.4596313 26.3359375,20.6382708 25.1289062,20.6382708 C22.8320312,20.6382708 20.5,22.5950413 20.5,26.2911634 C20.5,28.5861411 21.3671875,31.013986 22.4335938,32.5842339 C23.3476562,33.9129053 24.1445312,35 25.2929688,35 Z" }) });
var Et = ({ secondary: e3, size: t2, fadeOut: n2, disabled: o2 }) => i("svg", { id: "icon-checkmark", xmlns: "http://www.w3.org/2000/svg", viewBox: "4 4 40 40", width: t2, height: t2, className: At()(xt.checkmark, e3 && xt.secondary, n2 && xt.fadeOut, o2 && xt.disabled), children: i("path", { d: "M21.05 33.1 35.2 18.95l-2.3-2.25-11.85 11.85-6-6-2.25 2.25ZM24 44q-4.1 0-7.75-1.575-3.65-1.575-6.375-4.3-2.725-2.725-4.3-6.375Q4 28.1 4 24q0-4.15 1.575-7.8 1.575-3.65 4.3-6.35 2.725-2.7 6.375-4.275Q19.9 4 24 4q4.15 0 7.8 1.575 3.65 1.575 6.35 4.275 2.7 2.7 4.275 6.35Q44 19.85 44 24q0 4.1-1.575 7.75-1.575 3.65-4.275 6.375t-6.35 4.3Q28.15 44 24 44Zm0-3q7.1 0 12.05-4.975Q41 31.05 41 24q0-7.1-4.95-12.05Q31.1 7 24 7q-7.05 0-12.025 4.95Q7 16.9 7 24q0 7.05 4.975 12.025Q16.95 41 24 41Zm0-17Z" }) });
var Pt = ({ size: e3, secondary: t2, disabled: n2 }) => i("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 -960 960 960", width: e3, height: e3, className: At()(xt.icon, t2 && xt.secondary, n2 && xt.disabled), children: i("path", { d: "M360-240q-33 0-56.5-23.5T280-320v-480q0-33 23.5-56.5T360-880h360q33 0 56.5 23.5T800-800v480q0 33-23.5 56.5T720-240H360Zm0-80h360v-480H360v480ZM200-80q-33 0-56.5-23.5T120-160v-560h80v560h440v80H200Zm160-240v-480 480Z" }) });
var Ot = ({ size: e3, secondary: t2, disabled: n2 }) => i("svg", { id: "icon-custom-provider", xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", width: e3, height: e3, className: At()(xt.icon, t2 && xt.secondary, n2 && xt.disabled), children: [i("path", { d: "M0 0h24v24H0z", fill: "none" }), i("path", { d: "M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" })] });
var Dt = ({ size: e3, secondary: t2, disabled: n2 }) => i("svg", { id: "icon-discord", fill: "#fff", xmlns: "http://www.w3.org/2000/svg", width: e3, height: e3, viewBox: "0 0 127.14 96.36", className: At()(xt.icon, t2 && xt.secondary, n2 && xt.disabled), children: i("path", { d: "M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z" }) });
var Tt = ({ size: e3, secondary: t2, disabled: n2 }) => i("svg", { id: "icon-exclamation", xmlns: "http://www.w3.org/2000/svg", viewBox: "5 2 13 20", width: e3, height: e3, className: At()(xt.exclamationMark, t2 && xt.secondary, n2 && xt.disabled), children: i("path", { d: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" }) });
var Nt = ({ size: e3, secondary: t2, disabled: n2 }) => i("svg", { width: e3, height: e3, viewBox: "0 0 666.66668 666.66717", xmlns: "http://www.w3.org/2000/svg", children: [i("defs", { id: "defs13", children: i("clipPath", { clipPathUnits: "userSpaceOnUse", id: "clipPath25", children: i("path", { d: "M 0,700 H 700 V 0 H 0 Z", id: "path23" }) }) }), i("g", { id: "g17", transform: "matrix(1.3333333,0,0,-1.3333333,-133.33333,799.99999)", children: i("g", { id: "g19", children: i("g", { id: "g21", clipPath: "url(#clipPath25)", children: [i("g", { id: "g27", transform: "translate(600,350)", children: i("path", { className: At()(xt.facebookIcon, n2 ? xt.disabledOutline : xt.outline), d: "m 0,0 c 0,138.071 -111.929,250 -250,250 -138.071,0 -250,-111.929 -250,-250 0,-117.245 80.715,-215.622 189.606,-242.638 v 166.242 h -51.552 V 0 h 51.552 v 32.919 c 0,85.092 38.508,124.532 122.048,124.532 15.838,0 43.167,-3.105 54.347,-6.211 V 81.986 c -5.901,0.621 -16.149,0.932 -28.882,0.932 -40.993,0 -56.832,-15.528 -56.832,-55.9 V 0 h 81.659 l -14.028,-76.396 h -67.631 V -248.169 C -95.927,-233.218 0,-127.818 0,0", id: "path29" }) }), i("g", { id: "g31", transform: "translate(447.9175,273.6036)", children: i("path", { className: At()(xt.facebookIcon, n2 ? xt.disabledLetter : xt.letter), d: "M 0,0 14.029,76.396 H -67.63 v 27.019 c 0,40.372 15.838,55.899 56.831,55.899 12.733,0 22.981,-0.31 28.882,-0.931 v 69.253 c -11.18,3.106 -38.509,6.212 -54.347,6.212 -83.539,0 -122.048,-39.441 -122.048,-124.533 V 76.396 h -51.552 V 0 h 51.552 v -166.242 c 19.343,-4.798 39.568,-7.362 60.394,-7.362 10.254,0 20.358,0.632 30.288,1.831 L -67.63,0 Z", id: "path33" }) })] }) }) })] });
var Lt = ({ size: e3, secondary: t2, disabled: n2 }) => i("svg", { id: "icon-github", xmlns: "http://www.w3.org/2000/svg", fill: "#fff", viewBox: "0 0 97.63 96", width: e3, height: e3, className: At()(xt.icon, t2 && xt.secondary, n2 && xt.disabled), children: [i("path", { d: "M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z" }), " "] });
var jt = ({ size: e3, disabled: t2 }) => i("svg", { id: "icon-google", xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", width: e3, height: e3, className: xt.googleIcon, children: [i("path", { className: At()(xt.googleIcon, t2 ? xt.disabled : xt.blue), d: "M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" }), i("path", { className: At()(xt.googleIcon, t2 ? xt.disabled : xt.green), d: "M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" }), i("path", { className: At()(xt.googleIcon, t2 ? xt.disabled : xt.yellow), d: "M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" }), i("path", { className: At()(xt.googleIcon, t2 ? xt.disabled : xt.red), d: "M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" }), i("path", { d: "M1 1h22v22H1z", fill: "none" })] });
var Mt = ({ size: e3, secondary: t2, disabled: n2 }) => i("svg", { id: "icon-linkedin", fill: "#fff", xmlns: "http://www.w3.org/2000/svg", width: e3, viewBox: "0 0 24 24", height: e3, className: At()(xt.icon, t2 && xt.secondary, n2 && xt.disabled), children: i("path", { d: "M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.3 6.5a1.78 1.78 0 01-1.8 1.75zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0013 14.19a.66.66 0 000 .14V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.55 0 3.36.86 3.36 3.66z" }) });
var Ut = ({ size: e3, secondary: t2, disabled: n2 }) => i("svg", { id: "icon-mail", xmlns: "http://www.w3.org/2000/svg", width: e3, height: e3, viewBox: "0 -960 960 960", className: At()(xt.icon, t2 && xt.secondary, n2 && xt.disabled), children: i("path", { d: "M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160H160Zm320-280L160-640v400h640v-400L480-440Zm0-80 320-200H160l320 200ZM160-640v-80 480-400Z" }) });
var Ft = ({ size: e3, disabled: t2 }) => i("svg", { id: "icon-microsoft", xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", width: e3, height: e3, className: xt.microsoftIcon, children: [i("rect", { className: At()(xt.microsoftIcon, t2 ? xt.disabled : xt.blue), x: "1", y: "1", width: "9", height: "9" }), i("rect", { className: At()(xt.microsoftIcon, t2 ? xt.disabled : xt.green), x: "1", y: "11", width: "9", height: "9" }), i("rect", { className: At()(xt.microsoftIcon, t2 ? xt.disabled : xt.yellow), x: "11", y: "1", width: "9", height: "9" }), i("rect", { className: At()(xt.microsoftIcon, t2 ? xt.disabled : xt.red), x: "11", y: "11", width: "9", height: "9" })] });
var Wt = ({ size: e3, secondary: t2, disabled: n2 }) => i("svg", { id: "icon-passkey", xmlns: "http://www.w3.org/2000/svg", viewBox: "3 1.5 19.5 19", width: e3, height: e3, className: At()(xt.icon, t2 && xt.secondary, n2 && xt.disabled), children: i("g", { id: "icon-passkey-all", children: [i("circle", { id: "icon-passkey-head", cx: "10.5", cy: "6", r: "4.5" }), i("path", { id: "icon-passkey-key", d: "M22.5,10.5a3.5,3.5,0,1,0-5,3.15V19L19,20.5,21.5,18,20,16.5,21.5,15l-1.24-1.24A3.5,3.5,0,0,0,22.5,10.5Zm-3.5,0a1,1,0,1,1,1-1A1,1,0,0,1,19,10.5Z" }), i("path", { id: "icon-passkey-body", d: "M14.44,12.52A6,6,0,0,0,12,12H9a6,6,0,0,0-6,6v2H16V14.49A5.16,5.16,0,0,1,14.44,12.52Z" })] }) });
var Ht = ({ size: e3, secondary: t2, disabled: n2 }) => i("svg", { id: "icon-password", xmlns: "http://www.w3.org/2000/svg", width: e3, height: e3, viewBox: "0 -960 960 960", className: At()(xt.icon, t2 && xt.secondary, n2 && xt.disabled), children: i("path", { d: "M80-200v-80h800v80H80Zm46-242-52-30 34-60H40v-60h68l-34-58 52-30 34 58 34-58 52 30-34 58h68v60h-68l34 60-52 30-34-60-34 60Zm320 0-52-30 34-60h-68v-60h68l-34-58 52-30 34 58 34-58 52 30-34 58h68v60h-68l34 60-52 30-34-60-34 60Zm320 0-52-30 34-60h-68v-60h68l-34-58 52-30 34 58 34-58 52 30-34 58h68v60h-68l34 60-52 30-34-60-34 60Z" }) });
var Rt = ({ size: e3, secondary: t2, disabled: n2 }) => i("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 -960 960 960", width: e3, height: e3, className: At()(xt.icon, t2 && xt.secondary, n2 && xt.disabled), children: i("path", { d: "M80-680v-200h200v80H160v120H80Zm0 600v-200h80v120h120v80H80Zm600 0v-80h120v-120h80v200H680Zm120-600v-120H680v-80h200v200h-80ZM700-260h60v60h-60v-60Zm0-120h60v60h-60v-60Zm-60 60h60v60h-60v-60Zm-60 60h60v60h-60v-60Zm-60-60h60v60h-60v-60Zm120-120h60v60h-60v-60Zm-60 60h60v60h-60v-60Zm-60-60h60v60h-60v-60Zm240-320v240H520v-240h240ZM440-440v240H200v-240h240Zm0-320v240H200v-240h240Zm-60 500v-120H260v120h120Zm0-320v-120H260v120h120Zm320 0v-120H580v120h120Z" }) });
var qt = ({ size: e3, secondary: t2, disabled: n2 }) => i("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 -960 960 960", width: e3, height: e3, className: At()(xt.icon, t2 && xt.secondary, n2 && xt.disabled), children: i("path", { d: "M280-240q-100 0-170-70T40-480q0-100 70-170t170-70q66 0 121 33t87 87h432v240h-80v120H600v-120H488q-32 54-87 87t-121 33Zm0-80q66 0 106-40.5t48-79.5h246v120h80v-120h80v-80H434q-8-39-48-79.5T280-640q-66 0-113 47t-47 113q0 66 47 113t113 47Zm0-80q33 0 56.5-23.5T360-480q0-33-23.5-56.5T280-560q-33 0-56.5 23.5T200-480q0 33 23.5 56.5T280-400Zm0-80Z" }) });
var zt = ({ size: e3, disabled: t2 }) => i("svg", { id: "icon-spinner", xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", width: e3, height: e3, className: At()(xt.loadingSpinner, t2 && xt.disabled), children: [i("path", { d: "M12,1A11,11,0,1,0,23,12,11,11,0,0,0,12,1Zm0,19a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z", opacity: ".25" }), i("path", { d: "M10.72,19.9a8,8,0,0,1-6.5-9.79A7.77,7.77,0,0,1,10.4,4.16a8,8,0,0,1,9.49,6.52A1.54,1.54,0,0,0,21.38,12h.13a1.37,1.37,0,0,0,1.38-1.54,11,11,0,1,0-12.7,12.39A1.54,1.54,0,0,0,12,21.34h0A1.47,1.47,0,0,0,10.72,19.9Z" })] });
var Kt = ({ name: e3, secondary: t2, size: n2 = 18, fadeOut: a2, disabled: r2 }) => i(o[e3], { size: n2, secondary: t2, fadeOut: a2, disabled: r2 });
var Bt = ({ children: e3, isLoading: t2, isSuccess: n2, fadeOut: o2, secondary: r2, hasIcon: s2, maxWidth: c2 }) => i(a.Fragment, { children: i("div", t2 ? { className: At()(xt.loadingSpinnerWrapper, xt.centerContent, c2 && xt.maxWidth), children: i(Kt, { name: "spinner", secondary: r2 }) } : n2 ? { className: At()(xt.loadingSpinnerWrapper, xt.centerContent, c2 && xt.maxWidth), children: i(Kt, { name: "checkmark", secondary: r2, fadeOut: o2 }) } : { className: s2 ? xt.loadingSpinnerWrapperIcon : xt.loadingSpinnerWrapper, children: e3 }) });
var Zt = () => i(Bt, { isLoading: true });
var Vt = (e3) => {
  const [t2, n2] = (0, m.useState)(e3);
  return (0, m.useEffect)(() => {
    e3 && n2(e3);
  }, [e3]), { flowState: t2 };
};
var $t = n(681);
var Jt = {};
Jt.setAttributes = _t(), Jt.insert = (e3) => {
  window._hankoStyle = e3;
}, Jt.domAPI = pt(), Jt.insertStyleElement = mt(), ut()($t.A, Jt);
var Qt = $t.A && $t.A.locals ? $t.A.locals : void 0;
var Yt = (e3, t2, n2) => {
  const { hanko: o2, setUIState: a2, isOwnFlow: r2 } = (0, m.useContext)(Uo);
  (0, m.useEffect)(() => o2.onBeforeStateChange(({ state: n3 }) => {
    e3 && r2(n3) && (a2((e4) => Object.assign(Object.assign({}, e4), { isDisabled: true, error: void 0 })), t2(n3.invokedAction.name == e3.name));
  }), [e3, o2, r2, t2, a2]), (0, m.useEffect)(() => o2.onAfterStateChange(({ state: o3 }) => {
    var a3;
    e3 && r2(o3) && (n2((null === (a3 = o3.previousAction) || void 0 === a3 ? void 0 : a3.name) == e3.name), t2(false));
  }), [o2, n2, t2, e3, r2]);
};
var Xt = (0, a.createContext)({});
var Gt = ({ onSubmit: e3, children: t2, hidden: n2 = false, maxWidth: o2, flowAction: r2 }) => i(Xt.Provider, { value: { flowAction: r2 }, children: r2 && r2.enabled && !n2 ? i("form", { onSubmit: e3 || ((e4) => (function(e5, t3, n3, o3) {
  return new (n3 || (n3 = Promise))(function(a2, r3) {
    function i2(e6) {
      try {
        c2(o3.next(e6));
      } catch (e7) {
        r3(e7);
      }
    }
    function s2(e6) {
      try {
        c2(o3.throw(e6));
      } catch (e7) {
        r3(e7);
      }
    }
    function c2(e6) {
      var t4;
      e6.done ? a2(e6.value) : (t4 = e6.value, t4 instanceof n3 ? t4 : new n3(function(e7) {
        e7(t4);
      })).then(i2, s2);
    }
    c2((o3 = o3.apply(e5, t3 || [])).next());
  });
})(void 0, void 0, void 0, function* () {
  return e4.preventDefault(), yield r2.run();
})), className: Qt.form, children: i("ul", { className: Qt.ul, children: (0, a.toChildArray)(t2).map((e4, t3) => i("li", { part: "form-item", className: At()(Qt.li, o2 ? Qt.maxWidth : null), children: e4 }, t3)) }) }) : null });
var en = (e3) => {
  var { title: t2, children: n2, secondary: o2, dangerous: a2, autofocus: r2, showLastUsed: s2, onClick: c2, icon: l2, showSuccessIcon: d2 } = e3, u2 = (function(e4, t3) {
    var n3 = {};
    for (var o3 in e4) Object.prototype.hasOwnProperty.call(e4, o3) && t3.indexOf(o3) < 0 && (n3[o3] = e4[o3]);
    if (null != e4 && "function" == typeof Object.getOwnPropertySymbols) {
      var a3 = 0;
      for (o3 = Object.getOwnPropertySymbols(e4); a3 < o3.length; a3++) t3.indexOf(o3[a3]) < 0 && Object.prototype.propertyIsEnumerable.call(e4, o3[a3]) && (n3[o3[a3]] = e4[o3[a3]]);
    }
    return n3;
  })(e3, ["title", "children", "secondary", "dangerous", "autofocus", "showLastUsed", "onClick", "icon", "showSuccessIcon"]);
  const h2 = (0, m.useRef)(null), { uiState: p2 } = (0, m.useContext)(Uo), { t: f2 } = (0, m.useContext)(v.TranslateContext), [_2, g2] = (0, m.useState)(false), [y2, b2] = (0, m.useState)(false), { flowAction: k2 } = (0, m.useContext)(Xt);
  Yt(k2, g2, b2), (0, m.useEffect)(() => {
    const { current: e4 } = h2;
    e4 && r2 && e4.focus();
  }, [r2]);
  const w2 = (0, m.useMemo)(() => d2 && (y2 || u2.isSuccess), [y2, u2, d2]), S2 = (0, m.useMemo)(() => p2.isDisabled || u2.disabled, [u2, p2]);
  return i("button", { part: a2 ? "button dangerous-button" : o2 ? "button secondary-button" : "button primary-button", title: t2, ref: h2, type: "submit", disabled: S2, onClick: c2, className: At()(Qt.button, a2 ? Qt.dangerous : o2 ? Qt.secondary : Qt.primary), "data-bubble": s2 ? f2("labels.lastUsed") : void 0, children: i(Bt, { isLoading: _2, isSuccess: w2, secondary: true, hasIcon: !!l2, maxWidth: true, children: [l2 ? i(Kt, { name: l2, secondary: o2, disabled: S2 }) : null, i("div", { className: Qt.caption, children: i("span", { children: n2 }) })] }) });
};
var tn = (e3) => {
  var t2, n2, o2, a2, r2, { label: s2 } = e3, c2 = (function(e4, t3) {
    var n3 = {};
    for (var o3 in e4) Object.prototype.hasOwnProperty.call(e4, o3) && t3.indexOf(o3) < 0 && (n3[o3] = e4[o3]);
    if (null != e4 && "function" == typeof Object.getOwnPropertySymbols) {
      var a3 = 0;
      for (o3 = Object.getOwnPropertySymbols(e4); a3 < o3.length; a3++) t3.indexOf(o3[a3]) < 0 && Object.prototype.propertyIsEnumerable.call(e4, o3[a3]) && (n3[o3[a3]] = e4[o3[a3]]);
    }
    return n3;
  })(e3, ["label"]);
  const l2 = (0, m.useRef)(null), { uiState: d2 } = (0, m.useContext)(Uo), { t: u2 } = (0, m.useContext)(v.TranslateContext), h2 = (0, m.useMemo)(() => d2.isDisabled || c2.disabled, [c2, d2]);
  (0, m.useEffect)(() => {
    const { current: e4 } = l2;
    e4 && c2.autofocus && (e4.focus(), e4.select());
  }, [c2.autofocus]);
  const p2 = (0, m.useMemo)(() => {
    var e4;
    return c2.markOptional && !(null === (e4 = c2.flowInput) || void 0 === e4 ? void 0 : e4.required) ? `${c2.placeholder} (${u2("labels.optional")})` : c2.placeholder;
  }, [c2.markOptional, c2.placeholder, c2.flowInput, u2]);
  return i("div", { className: Qt.inputWrapper, children: i("input", Object.assign({ part: "input text-input", required: null === (t2 = c2.flowInput) || void 0 === t2 ? void 0 : t2.required, maxLength: null === (n2 = c2.flowInput) || void 0 === n2 ? void 0 : n2.max_length, minLength: null === (o2 = c2.flowInput) || void 0 === o2 ? void 0 : o2.min_length, hidden: null === (a2 = c2.flowInput) || void 0 === a2 ? void 0 : a2.hidden }, c2, { ref: l2, "aria-label": p2, placeholder: p2, className: At()(Qt.input, !!(null === (r2 = c2.flowInput) || void 0 === r2 ? void 0 : r2.error) && c2.markError && Qt.error), disabled: h2 })) });
};
var nn = ({ children: e3 }) => i("section", { className: bt.content, children: e3 });
var on = n(751);
var an = {};
an.setAttributes = _t(), an.insert = (e3) => {
  window._hankoStyle = e3;
}, an.domAPI = pt(), an.insertStyleElement = mt(), ut()(on.A, an);
var rn = on.A && on.A.locals ? on.A.locals : void 0;
var sn = ({ children: e3, hidden: t2 }) => t2 ? null : i("section", { part: "divider", className: rn.divider, children: [i("div", { part: "divider-line", className: rn.line }), e3 ? i("div", { part: "divider-text", class: rn.text, children: e3 }) : null, i("div", { part: "divider-line", className: rn.line })] });
var cn = n(217);
var ln = {};
ln.setAttributes = _t(), ln.insert = (e3) => {
  window._hankoStyle = e3;
}, ln.domAPI = pt(), ln.insertStyleElement = mt(), ut()(cn.A, ln);
var dn = cn.A && cn.A.locals ? cn.A.locals : void 0;
var un = ({ state: e3, error: t2, flowError: n2 }) => {
  var o2, a2;
  const { t: r2 } = (0, m.useContext)(v.TranslateContext), { uiState: s2, setUIState: c2 } = (0, m.useContext)(Uo);
  return (0, m.useEffect)(() => {
    var t3, n3;
    if ("form_data_invalid_error" == (null === (t3 = null == e3 ? void 0 : e3.error) || void 0 === t3 ? void 0 : t3.code)) for (const t4 of Object.values(null == e3 ? void 0 : e3.actions)) {
      let o3 = false;
      for (const e4 of Object.values(null == t4 ? void 0 : t4.inputs)) if (null === (n3 = e4.error) || void 0 === n3 ? void 0 : n3.code) return c2(Object.assign(Object.assign({}, s2), { error: e4.error })), void (o3 = true);
      o3 || c2(Object.assign(Object.assign({}, s2), { error: e3.error }));
    }
    else (null == e3 ? void 0 : e3.error) && c2(Object.assign(Object.assign({}, s2), { error: null == e3 ? void 0 : e3.error }));
  }, [e3]), i("section", { part: "error", className: dn.errorBox, hidden: !(null === (o2 = s2.error) || void 0 === o2 ? void 0 : o2.code) && !(null == n2 ? void 0 : n2.code) && !t2, children: [i("span", { children: i(Kt, { name: "exclamation", size: 15 }) }), i("span", { id: "errorMessage", part: "error-text", children: r2(t2 ? `errors.${t2.code}` : `flowErrors.${(null === (a2 = s2.error) || void 0 === a2 ? void 0 : a2.code) || (null == n2 ? void 0 : n2.code)}`) })] });
};
var hn = n(547);
var pn = {};
pn.setAttributes = _t(), pn.insert = (e3) => {
  window._hankoStyle = e3;
}, pn.domAPI = pt(), pn.insertStyleElement = mt(), ut()(hn.A, pn);
var fn = hn.A && hn.A.locals ? hn.A.locals : void 0;
var _n = ({ children: e3 }) => i("h1", { part: "headline1", className: At()(fn.headline, fn.grade1), children: e3 });
var vn = n(579);
var mn = {};
mn.setAttributes = _t(), mn.insert = (e3) => {
  window._hankoStyle = e3;
}, mn.domAPI = pt(), mn.insertStyleElement = mt(), ut()(vn.A, mn);
var gn = vn.A && vn.A.locals ? vn.A.locals : void 0;
var yn = (e3) => {
  var { loadingSpinnerPosition: t2, dangerous: n2 = false, onClick: o2, flowAction: r2 } = e3, s2 = (function(e4, t3) {
    var n3 = {};
    for (var o3 in e4) Object.prototype.hasOwnProperty.call(e4, o3) && t3.indexOf(o3) < 0 && (n3[o3] = e4[o3]);
    if (null != e4 && "function" == typeof Object.getOwnPropertySymbols) {
      var a2 = 0;
      for (o3 = Object.getOwnPropertySymbols(e4); a2 < o3.length; a2++) t3.indexOf(o3[a2]) < 0 && Object.prototype.propertyIsEnumerable.call(e4, o3[a2]) && (n3[o3[a2]] = e4[o3[a2]]);
    }
    return n3;
  })(e3, ["loadingSpinnerPosition", "dangerous", "onClick", "flowAction"]);
  const { t: c2 } = (0, m.useContext)(v.TranslateContext), { uiState: l2 } = (0, m.useContext)(Uo), [d2, u2] = (0, m.useState)(), [h2, p2] = (0, m.useState)(false), [f2, _2] = (0, m.useState)(false);
  let g2;
  o2 || (o2 = (e4) => (function(e5, t3, n3, o3) {
    return new (n3 || (n3 = Promise))(function(a2, r3) {
      function i2(e6) {
        try {
          c3(o3.next(e6));
        } catch (e7) {
          r3(e7);
        }
      }
      function s3(e6) {
        try {
          c3(o3.throw(e6));
        } catch (e7) {
          r3(e7);
        }
      }
      function c3(e6) {
        var t4;
        e6.done ? a2(e6.value) : (t4 = e6.value, t4 instanceof n3 ? t4 : new n3(function(e7) {
          e7(t4);
        })).then(i2, s3);
      }
      c3((o3 = o3.apply(e5, t3 || [])).next());
    });
  })(void 0, void 0, void 0, function* () {
    return e4.preventDefault(), yield null == r2 ? void 0 : r2.run();
  })), Yt(r2, p2, _2);
  const y2 = (e4) => {
    e4.preventDefault(), u2(true);
  }, b2 = (e4) => {
    e4.preventDefault(), u2(false);
  }, k2 = (0, m.useMemo)(() => h2 || s2.isLoading, [h2, s2]), w2 = (0, m.useMemo)(() => f2 || s2.isSuccess, [f2, s2]), S2 = (0, m.useMemo)(() => r2 && !r2.enabled || s2.hidden, [r2, s2]), x2 = (0, m.useCallback)((e4) => {
    e4.preventDefault(), u2(false), o2(e4);
  }, [o2]), C2 = (0, m.useCallback)(() => S2 ? null : i(a.Fragment, { children: [d2 ? i(a.Fragment, { children: [i(yn, { onClick: x2, children: c2("labels.yes") }), "\xA0/\xA0", i(yn, { onClick: b2, children: c2("labels.no") }), "\xA0"] }) : null, i("button", Object.assign({}, s2, { onClick: n2 ? y2 : o2, disabled: d2 || s2.disabled || l2.isDisabled, part: "link", className: At()(gn.link, n2 ? gn.danger : null), children: s2.children }))] }), [S2, l2, d2, n2, o2, x2, s2, c2]);
  return i(a.Fragment, { children: i("span", { className: At()(gn.linkWrapper, "right" === t2 ? gn.reverse : null), onMouseEnter: () => {
    g2 && window.clearTimeout(g2);
  }, onMouseLeave: () => {
    g2 = window.setTimeout(() => {
      u2(false);
    }, 1e3);
  }, children: i(a.Fragment, d2 || !k2 && !w2 ? { children: C2() } : { children: [i(Bt, { isLoading: k2, isSuccess: w2, secondary: s2.secondary, fadeOut: true }), C2()] }) }) });
};
var bn = yn;
var kn = ({ children: e3, hidden: t2 = false }) => t2 ? null : i("section", { className: bt.footer, children: e3 });
var wn = (e3) => {
  var { label: t2 } = e3, n2 = (function(e4, t3) {
    var n3 = {};
    for (var o3 in e4) Object.prototype.hasOwnProperty.call(e4, o3) && t3.indexOf(o3) < 0 && (n3[o3] = e4[o3]);
    if (null != e4 && "function" == typeof Object.getOwnPropertySymbols) {
      var a3 = 0;
      for (o3 = Object.getOwnPropertySymbols(e4); a3 < o3.length; a3++) t3.indexOf(o3[a3]) < 0 && Object.prototype.propertyIsEnumerable.call(e4, o3[a3]) && (n3[o3[a3]] = e4[o3[a3]]);
    }
    return n3;
  })(e3, ["label"]);
  const { uiState: o2 } = (0, m.useContext)(Uo), a2 = (0, m.useMemo)(() => o2.isDisabled || n2.disabled, [n2, o2]);
  return i("div", { className: Qt.inputWrapper, children: i("label", { className: Qt.checkboxWrapper, children: [i("input", Object.assign({ part: "input checkbox-input", type: "checkbox", "aria-label": t2, className: Qt.checkbox }, n2)), i("span", { className: At()(Qt.label, a2 ? Qt.disabled : null), children: t2 })] }) });
};
var Sn = () => i("section", { className: rn.spacer });
var xn = n(193);
var Cn = {};
Cn.setAttributes = _t(), Cn.insert = (e3) => {
  window._hankoStyle = e3;
}, Cn.domAPI = pt(), Cn.insertStyleElement = mt(), ut()(xn.A, Cn);
var An = xn.A && xn.A.locals ? xn.A.locals : void 0;
var In = ({ children: e3, hidden: t2, center: n2 }) => t2 ? null : i("p", { part: "paragraph", className: At()(An.paragraph, n2 && An.center, n2 && An.column), children: e3 });
var En = function(e3, t2, n2, o2) {
  return new (n2 || (n2 = Promise))(function(a2, r2) {
    function i2(e4) {
      try {
        c2(o2.next(e4));
      } catch (e5) {
        r2(e5);
      }
    }
    function s2(e4) {
      try {
        c2(o2.throw(e4));
      } catch (e5) {
        r2(e5);
      }
    }
    function c2(e4) {
      var t3;
      e4.done ? a2(e4.value) : (t3 = e4.value, t3 instanceof n2 ? t3 : new n2(function(e5) {
        e5(t3);
      })).then(i2, s2);
    }
    c2((o2 = o2.apply(e3, t2 || [])).next());
  });
};
var Pn = (e3) => {
  var t2;
  const { t: n2 } = (0, m.useContext)(v.TranslateContext), { init: o2, initialComponentName: r2, uiState: s2, setUIState: c2, hidePasskeyButtonOnLogin: l2, lastLogin: d2 } = (0, m.useContext)(Uo), [u2, h2] = (0, m.useState)(false), [p2, f2] = (0, m.useState)(null), [_2, g2] = (0, m.useState)(null), { flowState: y2 } = Vt(e3.state), b2 = Le.supported(), [k2, w2] = (0, m.useState)(void 0), [S2, x2] = (0, m.useState)(null), [C2, A2] = (0, m.useState)(false), I2 = (e4) => {
    if (e4.preventDefault(), e4.target instanceof HTMLInputElement) {
      const { value: t3 } = e4.target;
      g2(t3), E2(t3);
    }
  }, E2 = (e4) => {
    const t3 = () => c2((t4) => Object.assign(Object.assign({}, t4), { email: e4, username: null })), n3 = () => c2((t4) => Object.assign(Object.assign({}, t4), { email: null, username: e4 }));
    switch (p2) {
      case "email":
        t3();
        break;
      case "username":
        n3();
        break;
      case "identifier":
        e4.match(/^[^@]+@[^@]+\.[^@]+$/) ? t3() : n3();
    }
  }, P2 = (0, m.useMemo)(() => (!!y2.actions.webauthn_generate_request_options.enabled || !!y2.actions.thirdparty_oauth.enabled) && y2.actions.continue_with_login_identifier.enabled, [y2.actions]), O2 = y2.actions.continue_with_login_identifier.inputs;
  return (0, m.useEffect)(() => {
    const e4 = y2.actions.continue_with_login_identifier.inputs;
    (null == e4 ? void 0 : e4.email) ? (f2("email"), g2(s2.email)) : (null == e4 ? void 0 : e4.username) ? (f2("username"), g2(s2.username)) : (f2("identifier"), g2(s2.email || s2.username));
  }, [y2, s2.email, s2.username]), i(a.Fragment, { children: [i(nn, { children: [i(_n, { children: n2("headlines.signIn") }), i(un, { state: y2, error: k2 }), O2 ? i(a.Fragment, { children: [i(Gt, { flowAction: y2.actions.continue_with_login_identifier, onSubmit: (e4) => En(void 0, void 0, void 0, function* () {
    return e4.preventDefault(), E2(_2), y2.actions.continue_with_login_identifier.run({ [p2]: _2 });
  }), maxWidth: true, children: [O2.email ? i(tn, { type: "email", autoComplete: "username webauthn", autoCorrect: "off", flowInput: O2.email, onInput: I2, value: _2, placeholder: n2("labels.email"), pattern: "^[^@]+@[^@]+\\.[^@]+$" }) : O2.username ? i(tn, { type: "text", autoComplete: "username webauthn", autoCorrect: "off", flowInput: O2.username, onInput: I2, value: _2, placeholder: n2("labels.username") }) : i(tn, { type: "text", autoComplete: "username webauthn", autoCorrect: "off", flowInput: O2.identifier, onInput: I2, value: _2, placeholder: n2("labels.emailOrUsername") }), i(en, { children: n2("labels.continue") })] }), i(sn, { hidden: !P2, children: n2("labels.or") })] }) : null, y2.actions.thirdparty_oauth.enabled ? null === (t2 = y2.actions.thirdparty_oauth.inputs.provider.allowed_values) || void 0 === t2 ? void 0 : t2.map((e4) => i(Gt, { flowAction: y2.actions.thirdparty_oauth, onSubmit: (t3) => ((e5, t4) => En(void 0, void 0, void 0, function* () {
    e5.preventDefault(), x2(t4);
    const n3 = Ge();
    et(n3);
    try {
      const e6 = yield y2.actions.thirdparty_oauth.run({ provider: t4, redirect_to: window.location.toString(), code_verifier: n3 });
      return e6.error && (nt(), x2(null)), e6;
    } catch (e6) {
      throw nt(), x2(null), e6;
    }
  }))(t3, e4.value), children: i(en, { isLoading: e4.value == S2, secondary: true, icon: e4.value.startsWith("custom_") ? "customProvider" : e4.value, showLastUsed: "third_party" == (null == d2 ? void 0 : d2.login_method) && (null == d2 ? void 0 : d2.third_party_provider) == e4.value, children: n2("labels.signInWith", { provider: e4.name }) }) }, e4.value)) : null, y2.actions.webauthn_generate_request_options.enabled && !l2 ? i(Gt, { flowAction: y2.actions.webauthn_generate_request_options, children: i(en, { secondary: true, title: b2 ? null : n2("labels.webauthnUnsupported"), disabled: !b2, children: n2("labels.signInPasskey") }) }) : null, y2.actions.remember_me.enabled && i(a.Fragment, { children: [i(Sn, {}), i(wn, { required: false, type: "checkbox", label: n2("labels.staySignedIn"), checked: C2, onChange: (e4) => En(void 0, void 0, void 0, function* () {
    return A2((e5) => !e5), y2.actions.remember_me.run({ remember_me: !C2 });
  }) })] })] }), i(kn, { hidden: "auth" !== r2, children: i(In, { center: true, children: [i("span", { children: n2("labels.dontHaveAnAccount") }), i(bn, { onClick: (e4) => En(void 0, void 0, void 0, function* () {
    e4.preventDefault(), h2(true), o2("registration");
  }), loadingSpinnerPosition: "left", isLoading: u2, children: n2("labels.signUp") })] }) })] });
};
var On = (e3) => {
  var { index: t2, focus: n2, digit: o2 = "" } = e3, a2 = (function(e4, t3) {
    var n3 = {};
    for (var o3 in e4) Object.prototype.hasOwnProperty.call(e4, o3) && t3.indexOf(o3) < 0 && (n3[o3] = e4[o3]);
    if (null != e4 && "function" == typeof Object.getOwnPropertySymbols) {
      var a3 = 0;
      for (o3 = Object.getOwnPropertySymbols(e4); a3 < o3.length; a3++) t3.indexOf(o3[a3]) < 0 && Object.prototype.propertyIsEnumerable.call(e4, o3[a3]) && (n3[o3[a3]] = e4[o3[a3]]);
    }
    return n3;
  })(e3, ["index", "focus", "digit"]);
  const r2 = (0, m.useRef)(null), { uiState: s2 } = (0, m.useContext)(Uo), c2 = () => {
    const { current: e4 } = r2;
    e4 && (e4.focus(), e4.select());
  }, l2 = (0, m.useMemo)(() => s2.isDisabled || a2.disabled, [a2, s2]);
  return (0, m.useEffect)(() => {
    0 === t2 && c2();
  }, [t2, a2.disabled]), (0, m.useMemo)(() => {
    n2 && c2();
  }, [n2]), i("div", { className: Qt.passcodeDigitWrapper, children: i("input", Object.assign({}, a2, { part: "input passcode-input", "aria-label": `${a2.name}-digit-${t2 + 1}`, name: a2.name + t2.toString(10), type: "text", inputMode: "numeric", maxLength: 1, ref: r2, value: o2.charAt(0), required: true, className: Qt.input, disabled: l2 })) });
};
var Dn = ({ passcodeDigits: e3 = [], numberOfInputs: t2 = 6, onInput: n2, disabled: o2 = false }) => {
  const [a2, r2] = (0, m.useState)(0), s2 = () => e3.slice(), c2 = () => {
    a2 < t2 - 1 && r2(a2 + 1);
  }, l2 = () => {
    a2 > 0 && r2(a2 - 1);
  }, d2 = (e4) => {
    const t3 = s2();
    t3[a2] = e4.charAt(0), n2(t3);
  }, u2 = (e4) => {
    if (e4.preventDefault(), o2) return;
    const i2 = e4.clipboardData.getData("text/plain").slice(0, t2 - a2).split(""), c3 = s2();
    let l3 = a2;
    for (let e5 = 0; e5 < t2; ++e5) e5 >= a2 && i2.length > 0 && (c3[e5] = i2.shift(), l3++);
    r2(l3), n2(c3);
  }, h2 = (e4) => {
    "Backspace" === e4.key ? (e4.preventDefault(), d2(""), l2()) : "Delete" === e4.key ? (e4.preventDefault(), d2("")) : "ArrowLeft" === e4.key ? (e4.preventDefault(), l2()) : "ArrowRight" === e4.key ? (e4.preventDefault(), c2()) : " " !== e4.key && "Spacebar" !== e4.key && "Space" !== e4.key || e4.preventDefault();
  }, p2 = (e4) => {
    e4.target instanceof HTMLInputElement && d2(e4.target.value), c2();
  };
  return (0, m.useEffect)(() => {
    0 === e3.length && r2(0);
  }, [e3]), i("div", { className: Qt.passcodeInputWrapper, children: Array.from(Array(t2)).map((t3, n3) => i(On, { name: "passcode", index: n3, focus: a2 === n3, digit: e3[n3], onKeyDown: h2, onInput: p2, onPaste: u2, onFocus: () => ((e4) => {
    r2(e4);
  })(n3), disabled: o2 }, n3)) });
};
var Tn = function(e3, t2, n2, o2) {
  return new (n2 || (n2 = Promise))(function(a2, r2) {
    function i2(e4) {
      try {
        c2(o2.next(e4));
      } catch (e5) {
        r2(e5);
      }
    }
    function s2(e4) {
      try {
        c2(o2.throw(e4));
      } catch (e5) {
        r2(e5);
      }
    }
    function c2(e4) {
      var t3;
      e4.done ? a2(e4.value) : (t3 = e4.value, t3 instanceof n2 ? t3 : new n2(function(e5) {
        e5(t3);
      })).then(i2, s2);
    }
    c2((o2 = o2.apply(e3, t2 || [])).next());
  });
};
var Nn = (e3) => {
  const { t: t2 } = (0, m.useContext)(v.TranslateContext), { flowState: n2 } = Vt(e3.state), { uiState: o2, setUIState: r2 } = (0, m.useContext)(Uo), [s2, c2] = (0, m.useState)(), [l2, d2] = (0, m.useState)(n2.payload.resend_after), [u2, h2] = (0, m.useState)([]), p2 = (0, m.useMemo)(() => {
    var e4;
    return "passcode_max_attempts_reached" === (null === (e4 = n2.error) || void 0 === e4 ? void 0 : e4.code);
  }, [n2]), f2 = (0, m.useCallback)((e4) => Tn(void 0, void 0, void 0, function* () {
    return yield n2.actions.verify_passcode.run({ code: e4 });
  }), [n2]);
  return (0, m.useEffect)(() => {
    const e4 = s2 > 0 && setInterval(() => c2(s2 - 1), 1e3);
    return () => clearInterval(e4);
  }, [s2]), (0, m.useEffect)(() => {
    const e4 = l2 > 0 && setInterval(() => {
      d2(l2 - 1);
    }, 1e3);
    return () => clearInterval(e4);
  }, [l2]), (0, m.useEffect)(() => {
    var e4;
    0 == l2 && "rate_limit_exceeded" == (null === (e4 = n2.error) || void 0 === e4 ? void 0 : e4.code) && r2((e5) => Object.assign(Object.assign({}, e5), { error: null }));
  }, [l2]), (0, m.useEffect)(() => {
    h2([]), n2.payload.resend_after >= 0 && d2(n2.payload.resend_after);
  }, [n2]), i(a.Fragment, { children: [i(nn, { children: [i(_n, { children: t2("headlines.loginPasscode") }), i(un, { state: n2 }), i(In, { children: o2.email ? t2("texts.enterPasscode") : t2("texts.enterPasscodeNoEmail") }), i(In, { hidden: !o2.email, children: i("b", { children: o2.email }) }), i(Gt, { flowAction: n2.actions.verify_passcode, onSubmit: (e4) => Tn(void 0, void 0, void 0, function* () {
    return e4.preventDefault(), f2(u2.join(""));
  }), children: [i(Dn, { onInput: (e4) => {
    if (h2(e4), 6 === e4.filter((e5) => "" !== e5).length) return f2(e4.join(""));
  }, passcodeDigits: u2, numberOfInputs: 6, disabled: s2 <= 0 || p2 }), i(en, { disabled: s2 <= 0 || p2, children: t2("labels.continue") })] })] }), i(kn, { children: [i(bn, { flowAction: n2.actions.back, loadingSpinnerPosition: "right", children: t2("labels.back") }), i(bn, { disabled: l2 > 0, flowAction: n2.actions.resend_passcode, loadingSpinnerPosition: "left", children: l2 > 0 ? t2("labels.passcodeResendAfter", { passcodeResendAfter: l2 }) : t2("labels.sendNewPasscode") })] })] });
};
var Ln = (e3) => {
  const { t: t2 } = (0, m.useContext)(v.TranslateContext), { flowState: n2 } = Vt(e3.state);
  return i(a.Fragment, { children: [i(nn, { children: [i(_n, { children: t2("headlines.registerAuthenticator") }), i(un, { state: n2 }), i(In, { children: t2("texts.setupPasskey") }), i(Gt, { flowAction: n2.actions.webauthn_generate_creation_options, children: i(en, { autofocus: true, icon: "passkey", children: t2("labels.registerAuthenticator") }) })] }), i(kn, { hidden: !n2.actions.skip.enabled && !n2.actions.back.enabled, children: [i(bn, { loadingSpinnerPosition: "right", flowAction: n2.actions.back, children: t2("labels.back") }), i(bn, { loadingSpinnerPosition: "left", flowAction: n2.actions.skip, children: t2("labels.skip") })] })] });
};
var jn = function(e3, t2, n2, o2) {
  return new (n2 || (n2 = Promise))(function(a2, r2) {
    function i2(e4) {
      try {
        c2(o2.next(e4));
      } catch (e5) {
        r2(e5);
      }
    }
    function s2(e4) {
      try {
        c2(o2.throw(e4));
      } catch (e5) {
        r2(e5);
      }
    }
    function c2(e4) {
      var t3;
      e4.done ? a2(e4.value) : (t3 = e4.value, t3 instanceof n2 ? t3 : new n2(function(e5) {
        e5(t3);
      })).then(i2, s2);
    }
    c2((o2 = o2.apply(e3, t2 || [])).next());
  });
};
var Mn = (e3) => {
  const { t: t2 } = (0, m.useContext)(v.TranslateContext), { flowState: n2 } = Vt(e3.state), [o2, r2] = (0, m.useState)(), [s2, c2] = (0, m.useState)(), l2 = (0, m.useMemo)(() => i(bn, { flowAction: n2.actions.continue_to_passcode_confirmation_recovery, loadingSpinnerPosition: "left", children: t2("labels.forgotYourPassword") }), [n2, t2]), d2 = (0, m.useMemo)(() => i(bn, { flowAction: n2.actions.continue_to_login_method_chooser, loadingSpinnerPosition: "left", children: "Choose another method" }), [n2]);
  return (0, m.useEffect)(() => {
    const e4 = s2 > 0 && setInterval(() => c2(s2 - 1), 1e3);
    return () => clearInterval(e4);
  }, [s2]), i(a.Fragment, { children: [i(nn, { children: [i(_n, { children: t2("headlines.loginPassword") }), i(un, { state: n2 }), i(Gt, { flowAction: n2.actions.password_login, onSubmit: (e4) => jn(void 0, void 0, void 0, function* () {
    return e4.preventDefault(), n2.actions.password_login.run({ password: o2 });
  }), children: [i(tn, { type: "password", flowInput: n2.actions.password_login.inputs.password, autocomplete: "current-password", placeholder: t2("labels.password"), onInput: (e4) => jn(void 0, void 0, void 0, function* () {
    e4.target instanceof HTMLInputElement && r2(e4.target.value);
  }), autofocus: true }), i(en, { disabled: s2 > 0, children: s2 > 0 ? t2("labels.passwordRetryAfter", { passwordRetryAfter: s2 }) : t2("labels.signIn") })] }), n2.actions.continue_to_login_method_chooser.enabled ? l2 : null] }), i(kn, { children: [i(bn, { flowAction: n2.actions.back, loadingSpinnerPosition: "right", children: t2("labels.back") }), n2.actions.continue_to_login_method_chooser.enabled ? d2 : l2] })] });
};
var Un = function(e3, t2, n2, o2) {
  return new (n2 || (n2 = Promise))(function(a2, r2) {
    function i2(e4) {
      try {
        c2(o2.next(e4));
      } catch (e5) {
        r2(e5);
      }
    }
    function s2(e4) {
      try {
        c2(o2.throw(e4));
      } catch (e5) {
        r2(e5);
      }
    }
    function c2(e4) {
      var t3;
      e4.done ? a2(e4.value) : (t3 = e4.value, t3 instanceof n2 ? t3 : new n2(function(e5) {
        e5(t3);
      })).then(i2, s2);
    }
    c2((o2 = o2.apply(e3, t2 || [])).next());
  });
};
var Fn = (e3) => {
  const { t: t2 } = (0, m.useContext)(v.TranslateContext), { flowState: n2 } = Vt(e3.state), [o2, a2] = (0, m.useState)();
  return i(nn, { children: [i(_n, { children: t2("headlines.registerPassword") }), i(un, { state: n2 }), i(In, { children: t2("texts.passwordFormatHint", { minLength: n2.actions.password_recovery.inputs.new_password.min_length, maxLength: 72 }) }), i(Gt, { flowAction: n2.actions.password_recovery, onSubmit: (e4) => Un(void 0, void 0, void 0, function* () {
    return e4.preventDefault(), n2.actions.password_recovery.run({ new_password: o2 });
  }), children: [i(tn, { type: "password", autocomplete: "new-password", flowInput: n2.actions.password_recovery.inputs.new_password, placeholder: t2("labels.newPassword"), onInput: (e4) => Un(void 0, void 0, void 0, function* () {
    e4.target instanceof HTMLInputElement && a2(e4.target.value);
  }), autofocus: true }), i(en, { children: t2("labels.continue") })] })] });
};
var Wn = (e3) => {
  const { t: t2 } = (0, m.useContext)(v.TranslateContext), { flowState: n2 } = Vt(e3.state);
  return i(a.Fragment, { children: [i(nn, { children: [i(_n, { children: t2("headlines.selectLoginMethod") }), i(un, { flowError: null == n2 ? void 0 : n2.error }), i(In, { children: t2("texts.howDoYouWantToLogin") }), i(Gt, { flowAction: n2.actions.continue_to_passcode_confirmation, children: i(en, { secondary: true, icon: "mail", children: t2("labels.passcode") }) }), i(Gt, { flowAction: n2.actions.continue_to_password_login, children: i(en, { secondary: true, icon: "password", children: t2("labels.password") }) }), i(Gt, { flowAction: n2.actions.webauthn_generate_request_options, children: i(en, { secondary: true, icon: "passkey", children: t2("labels.passkey") }) })] }), i(kn, { children: i(bn, { flowAction: n2.actions.back, loadingSpinnerPosition: "right", children: t2("labels.back") }) })] });
};
var Hn = function(e3, t2, n2, o2) {
  return new (n2 || (n2 = Promise))(function(a2, r2) {
    function i2(e4) {
      try {
        c2(o2.next(e4));
      } catch (e5) {
        r2(e5);
      }
    }
    function s2(e4) {
      try {
        c2(o2.throw(e4));
      } catch (e5) {
        r2(e5);
      }
    }
    function c2(e4) {
      var t3;
      e4.done ? a2(e4.value) : (t3 = e4.value, t3 instanceof n2 ? t3 : new n2(function(e5) {
        e5(t3);
      })).then(i2, s2);
    }
    c2((o2 = o2.apply(e3, t2 || [])).next());
  });
};
var Rn = (e3) => {
  var t2;
  const { t: n2 } = (0, m.useContext)(v.TranslateContext), { init: o2, uiState: r2, setUIState: s2, initialComponentName: c2 } = (0, m.useContext)(Uo), { flowState: l2 } = Vt(e3.state), d2 = l2.actions.register_login_identifier.inputs, u2 = !(!(null == d2 ? void 0 : d2.email) || !(null == d2 ? void 0 : d2.username)), [h2, p2] = (0, m.useState)(void 0), [f2, _2] = (0, m.useState)(null), [g2, y2] = (0, m.useState)(false), [b2, k2] = (0, m.useState)(false), w2 = (0, m.useMemo)(() => !!l2.actions.thirdparty_oauth.enabled && l2.actions.register_login_identifier.enabled, [l2.actions]);
  return i(a.Fragment, { children: [i(nn, { children: [i(_n, { children: n2("headlines.signUp") }), i(un, { state: l2, error: h2 }), d2 ? i(a.Fragment, { children: [i(Gt, { flowAction: l2.actions.register_login_identifier, onSubmit: (e4) => Hn(void 0, void 0, void 0, function* () {
    return e4.preventDefault(), yield l2.actions.register_login_identifier.run({ email: r2.email, username: r2.username });
  }), maxWidth: true, children: [d2.username ? i(tn, { markOptional: u2, markError: u2, type: "text", autoComplete: "username", autoCorrect: "off", flowInput: d2.username, onInput: (e4) => {
    if (e4.preventDefault(), e4.target instanceof HTMLInputElement) {
      const { value: t3 } = e4.target;
      s2((e5) => Object.assign(Object.assign({}, e5), { username: t3 }));
    }
  }, value: r2.username, placeholder: n2("labels.username") }) : null, d2.email ? i(tn, { markOptional: u2, markError: u2, type: "email", autoComplete: "email", autoCorrect: "off", flowInput: d2.email, onInput: (e4) => {
    if (e4.preventDefault(), e4.target instanceof HTMLInputElement) {
      const { value: t3 } = e4.target;
      s2((e5) => Object.assign(Object.assign({}, e5), { email: t3 }));
    }
  }, value: r2.email, placeholder: n2("labels.email"), pattern: "^.*[^0-9]+$" }) : null, i(en, { autofocus: true, children: n2("labels.continue") })] }), i(sn, { hidden: !w2, children: n2("labels.or") })] }) : null, l2.actions.thirdparty_oauth.enabled ? null === (t2 = l2.actions.thirdparty_oauth.inputs.provider.allowed_values) || void 0 === t2 ? void 0 : t2.map((e4) => i(Gt, { flowAction: l2.actions.thirdparty_oauth, onSubmit: (t3) => ((e5, t4) => Hn(void 0, void 0, void 0, function* () {
    e5.preventDefault(), _2(t4);
    const n3 = Ge();
    et(n3);
    try {
      const e6 = yield l2.actions.thirdparty_oauth.run({ provider: t4, redirect_to: window.location.toString(), code_verifier: n3 }, { dispatchAfterStateChangeEvent: false });
      e6.error && (nt(), _2(null)), e6.dispatchAfterStateChangeEvent();
    } catch (e6) {
      throw nt(), _2(null), e6;
    }
  }))(t3, e4.value), children: i(en, { isLoading: e4.value == f2, secondary: true, icon: e4.value.startsWith("custom_") ? "customProvider" : e4.value, children: n2("labels.signInWith", { provider: e4.name }) }) }, e4.value)) : null, l2.actions.remember_me.enabled && i(a.Fragment, { children: [i(Sn, {}), i(wn, { required: false, type: "checkbox", label: n2("labels.staySignedIn"), checked: g2, onChange: (e4) => Hn(void 0, void 0, void 0, function* () {
    e4.preventDefault();
    const t3 = yield l2.actions.remember_me.run({ remember_me: !g2 }, { dispatchAfterStateChangeEvent: false });
    y2((e5) => !e5), t3.dispatchAfterStateChangeEvent();
  }) })] })] }), i(kn, { hidden: "auth" !== c2, children: i(In, { center: true, children: [i("span", { children: n2("labels.alreadyHaveAnAccount") }), i(bn, { onClick: (e4) => Hn(void 0, void 0, void 0, function* () {
    e4.preventDefault(), k2(true), o2("login");
  }), loadingSpinnerPosition: "left", isLoading: b2, children: n2("labels.signIn") })] }) })] });
};
var qn = function(e3, t2, n2, o2) {
  return new (n2 || (n2 = Promise))(function(a2, r2) {
    function i2(e4) {
      try {
        c2(o2.next(e4));
      } catch (e5) {
        r2(e5);
      }
    }
    function s2(e4) {
      try {
        c2(o2.throw(e4));
      } catch (e5) {
        r2(e5);
      }
    }
    function c2(e4) {
      var t3;
      e4.done ? a2(e4.value) : (t3 = e4.value, t3 instanceof n2 ? t3 : new n2(function(e5) {
        e5(t3);
      })).then(i2, s2);
    }
    c2((o2 = o2.apply(e3, t2 || [])).next());
  });
};
var zn = (e3) => {
  const { t: t2 } = (0, m.useContext)(v.TranslateContext), { flowState: n2 } = Vt(e3.state), [o2, r2] = (0, m.useState)();
  return i(a.Fragment, { children: [i(nn, { children: [i(_n, { children: t2("headlines.registerPassword") }), i(un, { state: n2 }), i(In, { children: t2("texts.passwordFormatHint", { minLength: n2.actions.register_password.inputs.new_password.min_length, maxLength: 72 }) }), i(Gt, { flowAction: n2.actions.register_password, onSubmit: (e4) => qn(void 0, void 0, void 0, function* () {
    return e4.preventDefault(), n2.actions.register_password.run({ new_password: o2 });
  }), children: [i(tn, { type: "password", autocomplete: "new-password", flowInput: n2.actions.register_password.inputs.new_password, placeholder: t2("labels.newPassword"), onInput: (e4) => qn(void 0, void 0, void 0, function* () {
    e4.target instanceof HTMLInputElement && r2(e4.target.value);
  }), autofocus: true }), i(en, { children: t2("labels.continue") })] })] }), i(kn, { hidden: !n2.actions.back.enabled && !n2.actions.skip.enabled, children: [i(bn, { loadingSpinnerPosition: "right", flowAction: n2.actions.back, children: t2("labels.back") }), i(bn, { loadingSpinnerPosition: "left", flowAction: n2.actions.skip, children: t2("labels.skip") })] })] });
};
var Kn = n(597);
var Bn = {};
Bn.setAttributes = _t(), Bn.insert = (e3) => {
  window._hankoStyle = e3;
}, Bn.domAPI = pt(), Bn.insertStyleElement = mt(), ut()(Kn.A, Bn);
var Zn = Kn.A && Kn.A.locals ? Kn.A.locals : void 0;
var Vn = function({ name: e3, columnSelector: t2, contentSelector: n2, data: o2 = [], checkedItemID: a2, setCheckedItemID: r2, dropdown: s2 = false }) {
  const c2 = (0, m.useCallback)((t3) => `${e3}-${t3}`, [e3]), l2 = (0, m.useCallback)((e4) => c2(e4) === a2, [a2, c2]), d2 = (e4) => {
    if (!(e4.target instanceof HTMLInputElement)) return;
    const t3 = parseInt(e4.target.value, 10), n3 = c2(t3);
    r2(n3 === a2 ? null : n3);
  };
  return i("div", { className: Zn.accordion, children: o2.map((o3, a3) => i("div", { className: Zn.accordionItem, children: [i("input", { type: "radio", className: Zn.accordionInput, id: `${e3}-${a3}`, name: e3, onClick: d2, value: a3, checked: l2(a3) }), i("label", { className: At()(Zn.label, s2 && Zn.dropdown), for: `${e3}-${a3}`, children: i("span", { className: Zn.labelText, children: t2(o3, a3) }) }), i("div", { className: At()(Zn.accordionContent, s2 && Zn.dropdownContent), children: n2(o3, a3) })] }, a3)) });
};
var $n = ({ children: e3 }) => i("h2", { part: "headline2", className: At()(fn.headline, fn.grade2), children: e3 });
var Jn = function(e3, t2, n2, o2) {
  return new (n2 || (n2 = Promise))(function(a2, r2) {
    function i2(e4) {
      try {
        c2(o2.next(e4));
      } catch (e5) {
        r2(e5);
      }
    }
    function s2(e4) {
      try {
        c2(o2.throw(e4));
      } catch (e5) {
        r2(e5);
      }
    }
    function c2(e4) {
      var t3;
      e4.done ? a2(e4.value) : (t3 = e4.value, t3 instanceof n2 ? t3 : new n2(function(e5) {
        e5(t3);
      })).then(i2, s2);
    }
    c2((o2 = o2.apply(e3, t2 || [])).next());
  });
};
var Qn = ({ checkedItemID: e3, setCheckedItemID: t2, flowState: n2, onState: o2 }) => {
  const { t: r2 } = (0, m.useContext)(v.TranslateContext), s2 = (0, m.useMemo)(() => false, []);
  return i(Vn, { name: "email-edit-dropdown", columnSelector: (e4) => {
    const t3 = i("span", { className: Zn.description, children: e4.is_verified ? e4.is_primary ? i(a.Fragment, { children: [" -", " ", r2("labels.primaryEmail")] }) : null : i(a.Fragment, { children: [" -", " ", r2("labels.unverifiedEmail")] }) });
    return e4.is_primary ? i(a.Fragment, { children: [i("b", { children: e4.address }), t3] }) : i(a.Fragment, { children: [e4.address, t3] });
  }, data: n2.payload.user.emails, contentSelector: (e4) => {
    var t3, c2;
    return i(a.Fragment, { children: [e4.is_primary ? i(a.Fragment, { children: i(In, { children: [i($n, { children: r2("headlines.isPrimaryEmail") }), r2("texts.isPrimaryEmail")] }) }) : i(a.Fragment, { children: i(In, { children: [i($n, { children: r2("headlines.setPrimaryEmail") }), r2("texts.setPrimaryEmail"), i("br", {}), i(bn, { flowAction: n2.actions.email_set_primary, onClick: (t4) => ((e5, t5) => Jn(void 0, void 0, void 0, function* () {
      e5.preventDefault();
      const a2 = yield n2.actions.email_set_primary.run({ email_id: t5 }, { dispatchAfterStateChangeEvent: false });
      return o2(a2);
    }))(t4, e4.id), loadingSpinnerPosition: "right", children: r2("labels.setAsPrimaryEmail") })] }) }), e4.is_verified ? i(a.Fragment, { children: i(In, { children: [i($n, { children: r2("headlines.emailVerified") }), r2("texts.emailVerified")] }) }) : i(a.Fragment, { children: i(In, { children: [i($n, { children: r2("headlines.emailUnverified") }), r2("texts.emailUnverified"), i("br", {}), i(bn, { flowAction: n2.actions.email_verify, onClick: (t4) => ((e5, t5) => Jn(void 0, void 0, void 0, function* () {
      e5.preventDefault();
      const a2 = yield n2.actions.email_verify.run({ email_id: t5 }, { dispatchAfterStateChangeEvent: false });
      return o2(a2);
    }))(t4, e4.id), loadingSpinnerPosition: "right", children: r2("labels.verify") })] }) }), (null === (t3 = n2.actions.email_delete.inputs.email_id.allowed_values) || void 0 === t3 ? void 0 : t3.map((e5) => e5.value).includes(e4.id)) ? i(a.Fragment, { children: i(In, { children: [i($n, { children: r2("headlines.emailDelete") }), r2("texts.emailDelete"), i("br", {}), i(bn, { dangerous: true, flowAction: n2.actions.email_delete, onClick: (t4) => ((e5, t5) => Jn(void 0, void 0, void 0, function* () {
      e5.preventDefault();
      const a2 = yield n2.actions.email_delete.run({ email_id: t5 }, { dispatchAfterStateChangeEvent: false });
      return o2(a2);
    }))(t4, e4.id), disabled: s2, loadingSpinnerPosition: "right", children: r2("labels.delete") })] }) }) : null, (null === (c2 = e4.identities) || void 0 === c2 ? void 0 : c2.length) > 0 ? i(a.Fragment, { children: i(In, { children: [i($n, { children: r2("headlines.connectedAccounts") }), e4.identities.map((e5) => e5.provider).join(", ")] }) }) : null] });
  }, checkedItemID: e3, setCheckedItemID: t2 });
};
var Yn = ({ onCredentialNameSubmit: e3, oldName: t2, onBack: n2, credential: o2, credentialType: r2, flowState: s2 }) => {
  const { t: c2 } = (0, m.useContext)(v.TranslateContext), [l2, d2] = (0, m.useState)(t2);
  return i(a.Fragment, { children: [i(nn, { children: [i(_n, { children: c2("security-key" === r2 ? "headlines.renameSecurityKey" : "headlines.renamePasskey") }), i(un, { flowError: null }), i(In, { children: c2("security-key" === r2 ? "texts.renameSecurityKey" : "texts.renamePasskey") }), i(Gt, { flowAction: s2.actions.webauthn_credential_rename, onSubmit: (t3) => e3(t3, o2.id, l2), children: [i(tn, { type: "text", name: r2, value: l2, minLength: 3, maxLength: 32, required: true, placeholder: c2("security-key" === r2 ? "labels.newSecurityKeyName" : "labels.newPasskeyName"), onInput: (e4) => (function(e5, t3, n3, o3) {
    return new (n3 || (n3 = Promise))(function(a2, r3) {
      function i2(e6) {
        try {
          c3(o3.next(e6));
        } catch (e7) {
          r3(e7);
        }
      }
      function s3(e6) {
        try {
          c3(o3.throw(e6));
        } catch (e7) {
          r3(e7);
        }
      }
      function c3(e6) {
        var t4;
        e6.done ? a2(e6.value) : (t4 = e6.value, t4 instanceof n3 ? t4 : new n3(function(e7) {
          e7(t4);
        })).then(i2, s3);
      }
      c3((o3 = o3.apply(e5, t3 || [])).next());
    });
  })(void 0, void 0, void 0, function* () {
    e4.target instanceof HTMLInputElement && d2(e4.target.value);
  }), autofocus: true }), i(en, { children: c2("labels.save") })] })] }), i(kn, { children: i(bn, { onClick: n2, loadingSpinnerPosition: "right", children: c2("labels.back") }) })] });
};
var Xn = ({ credentials: e3 = [], checkedItemID: t2, setCheckedItemID: n2, onBack: o2, onCredentialNameSubmit: r2, allowCredentialDeletion: s2, credentialType: c2, onCredentialDelete: l2, flowState: d2 }) => {
  const { t: u2 } = (0, m.useContext)(v.TranslateContext), { setPage: h2 } = (0, m.useContext)(Uo), p2 = (e4) => {
    if (e4.name) return e4.name;
    const t3 = e4.public_key.replace(/[\W_]/g, "");
    return `${"security-key" === c2 ? "SecurityKey" : "Passkey"}-${t3.substring(t3.length - 7, t3.length)}`;
  }, f2 = (e4) => new Date(e4).toLocaleString();
  return i(Vn, { name: "security-key" === c2 ? "security-key-edit-dropdown" : "passkey-edit-dropdown", columnSelector: (e4) => p2(e4), data: e3, contentSelector: (e4) => i(a.Fragment, { children: [i(In, { children: [i($n, { children: u2("security-key" === c2 ? "headlines.renameSecurityKey" : "headlines.renamePasskey") }), u2("security-key" === c2 ? "texts.renameSecurityKey" : "texts.renamePasskey"), i("br", {}), i(bn, { onClick: (t3) => ((e5, t4, n3) => {
    e5.preventDefault(), h2(i(Yn, { oldName: p2(t4), credential: t4, credentialType: n3, onBack: o2, onCredentialNameSubmit: r2, flowState: d2 }));
  })(t3, e4, c2), loadingSpinnerPosition: "right", children: u2("labels.rename") })] }), i(In, { hidden: !s2, children: [i($n, { children: u2("security-key" === c2 ? "headlines.deleteSecurityKey" : "headlines.deletePasskey") }), u2("security-key" === c2 ? "texts.deleteSecurityKey" : "texts.deletePasskey"), i("br", {}), i(bn, { dangerous: true, flowAction: d2.actions.webauthn_credential_delete, onClick: (t3) => l2(t3, e4.id), loadingSpinnerPosition: "right", children: u2("labels.delete") })] }), i(In, { children: [i($n, { children: u2("headlines.lastUsedAt") }), e4.last_used_at ? f2(e4.last_used_at) : "-"] }), i(In, { children: [i($n, { children: u2("headlines.createdAt") }), f2(e4.created_at)] })] }), checkedItemID: t2, setCheckedItemID: n2 });
};
var Gn = ({ name: e3, title: t2, children: n2, checkedItemID: o2, setCheckedItemID: r2 }) => i(Vn, { dropdown: true, name: e3, columnSelector: () => t2, contentSelector: () => i(a.Fragment, { children: n2 }), setCheckedItemID: r2, checkedItemID: o2, data: [{}] });
var eo = ({ flowError: e3 }) => {
  const { t: t2 } = (0, m.useContext)(v.TranslateContext);
  return i(a.Fragment, { children: e3 ? i("div", { className: dn.errorMessage, children: t2(`flowErrors.${null == e3 ? void 0 : e3.code}`) }) : null });
};
var to = ({ checkedItemID: e3, setCheckedItemID: t2, flowState: n2, onState: o2 }) => {
  var a2;
  const { t: r2 } = (0, m.useContext)(v.TranslateContext), { setUIState: s2 } = (0, m.useContext)(Uo), [c2, l2] = (0, m.useState)();
  return i(Gn, { name: "email-create-dropdown", title: r2("labels.addEmail"), checkedItemID: e3, setCheckedItemID: t2, children: [i(eo, { flowError: null === (a2 = n2.actions.email_create.inputs.email) || void 0 === a2 ? void 0 : a2.error }), i(Gt, { flowAction: n2.actions.email_create, onSubmit: (e4) => ((e5, t3) => (function(e6, t4, n3, o3) {
    return new (n3 || (n3 = Promise))(function(a3, r3) {
      function i2(e7) {
        try {
          c3(o3.next(e7));
        } catch (e8) {
          r3(e8);
        }
      }
      function s3(e7) {
        try {
          c3(o3.throw(e7));
        } catch (e8) {
          r3(e8);
        }
      }
      function c3(e7) {
        var t5;
        e7.done ? a3(e7.value) : (t5 = e7.value, t5 instanceof n3 ? t5 : new n3(function(e8) {
          e8(t5);
        })).then(i2, s3);
      }
      c3((o3 = o3.apply(e6, t4 || [])).next());
    });
  })(void 0, void 0, void 0, function* () {
    e5.preventDefault(), s2((e6) => Object.assign(Object.assign({}, e6), { email: t3 }));
    const a3 = yield n2.actions.email_create.run({ email: t3 }, { dispatchAfterStateChangeEvent: false });
    return o2(a3);
  }))(e4, c2).then(() => l2("")), children: [i(tn, { markError: true, type: "email", placeholder: r2("labels.newEmailAddress"), onInput: (e4) => {
    e4.preventDefault(), e4.target instanceof HTMLInputElement && l2(e4.target.value);
  }, value: c2, flowInput: n2.actions.email_create.inputs.email }), i(en, { children: r2("labels.save") })] })] });
};
var no = function(e3, t2, n2, o2) {
  return new (n2 || (n2 = Promise))(function(a2, r2) {
    function i2(e4) {
      try {
        c2(o2.next(e4));
      } catch (e5) {
        r2(e5);
      }
    }
    function s2(e4) {
      try {
        c2(o2.throw(e4));
      } catch (e5) {
        r2(e5);
      }
    }
    function c2(e4) {
      var t3;
      e4.done ? a2(e4.value) : (t3 = e4.value, t3 instanceof n2 ? t3 : new n2(function(e5) {
        e5(t3);
      })).then(i2, s2);
    }
    c2((o2 = o2.apply(e3, t2 || [])).next());
  });
};
var oo = ({ checkedItemID: e3, setCheckedItemID: t2, onState: n2, flowState: o2 }) => {
  var a2, r2, s2;
  const { t: c2 } = (0, m.useContext)(v.TranslateContext), [l2, d2] = (0, m.useState)(""), u2 = o2.actions.password_create.enabled ? o2.actions.password_create : o2.actions.password_update;
  return i(Gn, { name: "password-edit-dropdown", title: c2(o2.actions.password_create.enabled ? "labels.setPassword" : "labels.changePassword"), checkedItemID: e3, setCheckedItemID: t2, children: [i(In, { children: c2("texts.passwordFormatHint", { minLength: null === (a2 = u2.inputs.password.min_length) || void 0 === a2 ? void 0 : a2.toString(10), maxLength: null === (r2 = u2.inputs.password.max_length) || void 0 === r2 ? void 0 : r2.toString(10) }) }), i(eo, { flowError: null === (s2 = o2.actions.password_create.inputs.password) || void 0 === s2 ? void 0 : s2.error }), i(Gt, { flowAction: u2, onSubmit: (e4) => ((e5, t3) => no(void 0, void 0, void 0, function* () {
    e5.preventDefault();
    const o3 = yield u2.run({ password: t3 }, { dispatchAfterStateChangeEvent: false });
    return n2(o3);
  }))(e4, l2).then(() => d2("")), children: [i(tn, { markError: true, autoComplete: "new-password", placeholder: c2("labels.newPassword"), type: "password", onInput: (e4) => {
    e4.preventDefault(), e4.target instanceof HTMLInputElement && d2(e4.target.value);
  }, value: l2, flowInput: u2.inputs.password }), i(en, { children: c2("labels.save") })] }), i(bn, { dangerous: true, flowAction: o2.actions.password_delete, onClick: (e4) => ((e5) => no(void 0, void 0, void 0, function* () {
    e5.preventDefault();
    const t3 = yield o2.actions.password_delete.run(null, { dispatchAfterStateChangeEvent: false });
    return n2(t3);
  }))(e4).then(() => d2("")), loadingSpinnerPosition: "right", children: c2("labels.delete") })] });
};
var ao = ({ checkedItemID: e3, setCheckedItemID: t2, credentialType: n2, flowState: o2, onState: a2 }) => {
  const { t: r2 } = (0, m.useContext)(v.TranslateContext), s2 = Le.supported(), c2 = "passkey" == n2 ? o2.actions.webauthn_credential_create : o2.actions.security_key_create;
  return i(Gn, { name: "security-key" === n2 ? "security-key-create-dropdown" : "passkey-create-dropdown", title: r2("security-key" === n2 ? "labels.createSecurityKey" : "labels.createPasskey"), checkedItemID: e3, setCheckedItemID: t2, children: [i(In, { children: r2("security-key" === n2 ? "texts.securityKeySetUp" : "texts.setupPasskey") }), i(Gt, { onSubmit: (e4) => (function(e5, t3, n3, o3) {
    return new (n3 || (n3 = Promise))(function(a3, r3) {
      function i2(e6) {
        try {
          c3(o3.next(e6));
        } catch (e7) {
          r3(e7);
        }
      }
      function s3(e6) {
        try {
          c3(o3.throw(e6));
        } catch (e7) {
          r3(e7);
        }
      }
      function c3(e6) {
        var t4;
        e6.done ? a3(e6.value) : (t4 = e6.value, t4 instanceof n3 ? t4 : new n3(function(e7) {
          e7(t4);
        })).then(i2, s3);
      }
      c3((o3 = o3.apply(e5, t3 || [])).next());
    });
  })(void 0, void 0, void 0, function* () {
    e4.preventDefault();
    const t3 = yield c2.run(null, { dispatchAfterStateChangeEvent: false });
    return a2(t3);
  }), flowAction: c2, children: i(en, { title: s2 ? null : r2("labels.webauthnUnsupported"), children: r2("security-key" === n2 ? "labels.createSecurityKey" : "labels.createPasskey") }) })] });
};
var ro = function(e3, t2, n2, o2) {
  return new (n2 || (n2 = Promise))(function(a2, r2) {
    function i2(e4) {
      try {
        c2(o2.next(e4));
      } catch (e5) {
        r2(e5);
      }
    }
    function s2(e4) {
      try {
        c2(o2.throw(e4));
      } catch (e5) {
        r2(e5);
      }
    }
    function c2(e4) {
      var t3;
      e4.done ? a2(e4.value) : (t3 = e4.value, t3 instanceof n2 ? t3 : new n2(function(e5) {
        e5(t3);
      })).then(i2, s2);
    }
    c2((o2 = o2.apply(e3, t2 || [])).next());
  });
};
var io = ({ checkedItemID: e3, setCheckedItemID: t2, flowState: n2, onState: o2 }) => {
  var a2, r2;
  const { t: s2 } = (0, m.useContext)(v.TranslateContext), [c2, l2] = (0, m.useState)();
  return i(Gn, { name: "username-edit-dropdown", title: s2(n2.payload.user.username ? "labels.changeUsername" : "labels.setUsername"), checkedItemID: e3, setCheckedItemID: t2, children: [i(eo, { flowError: n2.payload.user.username ? null === (a2 = n2.actions.username_update.inputs.username) || void 0 === a2 ? void 0 : a2.error : null === (r2 = n2.actions.username_create.inputs.username) || void 0 === r2 ? void 0 : r2.error }), i(Gt, { flowAction: n2.payload.user.username ? n2.actions.username_update : n2.actions.username_create, onSubmit: (e4) => ro(void 0, void 0, void 0, function* () {
    e4.preventDefault();
    const t3 = n2.payload.user.username ? n2.actions.username_update : n2.actions.username_create, a3 = yield t3.run({ username: c2 }, { dispatchAfterStateChangeEvent: false });
    return o2(a3).then(() => l2(""));
  }), children: [i(tn, { markError: true, placeholder: s2("labels.username"), type: "text", onInput: (e4) => {
    e4.preventDefault(), e4.target instanceof HTMLInputElement && l2(e4.target.value);
  }, value: c2, flowInput: n2.payload.user.username ? n2.actions.username_update.inputs.username : n2.actions.username_create.inputs.username }), i(en, { children: s2("labels.save") })] }), i(bn, { flowAction: n2.actions.username_delete, onClick: (e4) => ro(void 0, void 0, void 0, function* () {
    e4.preventDefault();
    const t3 = yield n2.actions.username_delete.run(null, { dispatchAfterStateChangeEvent: false });
    return o2(t3).then(() => l2(""));
  }), dangerous: true, loadingSpinnerPosition: "right", children: s2("labels.delete") })] });
};
var so = ({ state: e3, onBack: t2 }) => {
  const { t: n2 } = (0, m.useContext)(v.TranslateContext);
  return i(a.Fragment, { children: [i(nn, { children: [i(_n, { children: n2("headlines.deleteAccount") }), i(un, { flowError: null }), i(In, { children: n2("texts.deleteAccount") }), i(Gt, { flowAction: e3.actions.account_delete, children: [i(wn, { required: true, type: "checkbox", label: n2("labels.deleteAccount") }), i(en, { children: n2("labels.delete") })] })] }), i(kn, { children: i(bn, { onClick: t2, children: n2("labels.back") }) })] });
};
var co = ({ checkedItemID: e3, setCheckedItemID: t2, flowState: n2, onState: o2 }) => {
  const { t: r2 } = (0, m.useContext)(v.TranslateContext), s2 = (e4) => new Date(e4).toLocaleString();
  return i(Vn, { name: "session-edit-dropdown", columnSelector: (e4) => {
    const t3 = i("b", { children: e4.user_agent ? e4.user_agent : e4.id }), n3 = e4.current ? i("span", { className: Zn.description, children: i(a.Fragment, { children: [" -", " ", r2("labels.currentSession")] }) }) : null;
    return i(a.Fragment, { children: [t3, n3] });
  }, data: n2.payload.sessions, contentSelector: (e4) => {
    var t3, c2, l2;
    return i(a.Fragment, { children: [i(In, { hidden: !e4.ip_address, children: [i($n, { children: r2("headlines.ipAddress") }), e4.ip_address] }), i(In, { children: [i($n, { children: r2("headlines.lastUsed") }), s2(e4.last_used)] }), i(In, { children: [i($n, { children: r2("headlines.createdAt") }), s2(e4.created_at)] }), (null === (l2 = null === (c2 = null === (t3 = n2.actions.session_delete.inputs.session_id) || void 0 === t3 ? void 0 : t3.allowed_values) || void 0 === c2 ? void 0 : c2.map((e5) => e5.value)) || void 0 === l2 ? void 0 : l2.includes(e4.id)) ? i(In, { children: [i($n, { children: r2("headlines.revokeSession") }), i(bn, { dangerous: true, onClick: (t4) => ((e5, t5) => (function(e6, t6, n3, o3) {
      return new (n3 || (n3 = Promise))(function(a2, r3) {
        function i2(e7) {
          try {
            c3(o3.next(e7));
          } catch (e8) {
            r3(e8);
          }
        }
        function s3(e7) {
          try {
            c3(o3.throw(e7));
          } catch (e8) {
            r3(e8);
          }
        }
        function c3(e7) {
          var t7;
          e7.done ? a2(e7.value) : (t7 = e7.value, t7 instanceof n3 ? t7 : new n3(function(e8) {
            e8(t7);
          })).then(i2, s3);
        }
        c3((o3 = o3.apply(e6, t6 || [])).next());
      });
    })(void 0, void 0, void 0, function* () {
      e5.preventDefault();
      const a2 = yield n2.actions.session_delete.run({ session_id: t5 }, { dispatchAfterStateChangeEvent: false });
      return o2(a2);
    }))(t4, e4.id), loadingSpinnerPosition: "right", children: r2("labels.revoke") })] }) : null] });
  }, checkedItemID: e3, setCheckedItemID: t2 });
};
var lo = function(e3, t2, n2, o2) {
  return new (n2 || (n2 = Promise))(function(a2, r2) {
    function i2(e4) {
      try {
        c2(o2.next(e4));
      } catch (e5) {
        r2(e5);
      }
    }
    function s2(e4) {
      try {
        c2(o2.throw(e4));
      } catch (e5) {
        r2(e5);
      }
    }
    function c2(e4) {
      var t3;
      e4.done ? a2(e4.value) : (t3 = e4.value, t3 instanceof n2 ? t3 : new n2(function(e5) {
        e5(t3);
      })).then(i2, s2);
    }
    c2((o2 = o2.apply(e3, t2 || [])).next());
  });
};
var uo = ({ checkedItemID: e3, setCheckedItemID: t2, flowState: n2, onState: o2 }) => {
  var r2, s2, c2, l2;
  const { t: d2 } = (0, m.useContext)(v.TranslateContext), u2 = i("span", { className: Zn.description, children: (null === (r2 = n2.payload.user.mfa_config) || void 0 === r2 ? void 0 : r2.auth_app_set_up) ? i(a.Fragment, { children: [" -", " ", d2("labels.configured")] }) : null }), h2 = i(a.Fragment, { children: [d2("labels.authenticatorAppManage"), " ", u2] });
  return i(Gn, { name: "authenticator-app-manage-dropdown", title: h2, checkedItemID: e3, setCheckedItemID: t2, children: [i($n, { children: d2((null === (s2 = n2.payload.user.mfa_config) || void 0 === s2 ? void 0 : s2.auth_app_set_up) ? "headlines.authenticatorAppAlreadySetUp" : "headlines.authenticatorAppNotSetUp") }), i(In, { children: [d2((null === (c2 = n2.payload.user.mfa_config) || void 0 === c2 ? void 0 : c2.auth_app_set_up) ? "texts.authenticatorAppAlreadySetUp" : "texts.authenticatorAppNotSetUp"), i("br", {}), (null === (l2 = n2.payload.user.mfa_config) || void 0 === l2 ? void 0 : l2.auth_app_set_up) ? i(bn, { flowAction: n2.actions.otp_secret_delete, onClick: (e4) => lo(void 0, void 0, void 0, function* () {
    e4.preventDefault();
    const t3 = yield n2.actions.otp_secret_delete.run(null, { dispatchAfterStateChangeEvent: false });
    return o2(t3);
  }), loadingSpinnerPosition: "right", dangerous: true, children: d2("labels.delete") }) : i(bn, { flowAction: n2.actions.continue_to_otp_secret_creation, onClick: (e4) => lo(void 0, void 0, void 0, function* () {
    e4.preventDefault();
    const t3 = yield n2.actions.continue_to_otp_secret_creation.run(null, { dispatchAfterStateChangeEvent: false });
    return o2(t3);
  }), loadingSpinnerPosition: "right", children: d2("labels.authenticatorAppAdd") })] })] });
};
var ho = ({ checkedItemID: e3, setCheckedItemID: t2, flowState: n2, onState: o2 }) => {
  const { t: r2 } = (0, m.useContext)(v.TranslateContext), s2 = (0, m.useMemo)(() => false, []);
  return i(Vn, { name: "connected-accounts", columnSelector: (e4) => {
    const t3 = i("b", { children: e4.provider });
    return i(a.Fragment, { children: t3 });
  }, contentSelector: (e4) => i(a.Fragment, { children: i(a.Fragment, { children: i(In, { children: [i($n, { children: r2("headlines.deleteIdentity") }), i(bn, { dangerous: true, flowAction: n2.actions.disconnect_thirdparty_oauth_provider, onClick: (t3) => ((e5, t4) => (function(e6, t5, n3, o3) {
    return new (n3 || (n3 = Promise))(function(a2, r3) {
      function i2(e7) {
        try {
          c2(o3.next(e7));
        } catch (e8) {
          r3(e8);
        }
      }
      function s3(e7) {
        try {
          c2(o3.throw(e7));
        } catch (e8) {
          r3(e8);
        }
      }
      function c2(e7) {
        var t6;
        e7.done ? a2(e7.value) : (t6 = e7.value, t6 instanceof n3 ? t6 : new n3(function(e8) {
          e8(t6);
        })).then(i2, s3);
      }
      c2((o3 = o3.apply(e6, t5 || [])).next());
    });
  })(void 0, void 0, void 0, function* () {
    e5.preventDefault();
    const a2 = yield n2.actions.disconnect_thirdparty_oauth_provider.run({ identity_id: t4 }, { dispatchAfterStateChangeEvent: false });
    return o2(a2);
  }))(t3, e4.identity_id), disabled: s2, loadingSpinnerPosition: "right", children: r2("labels.delete") })] }) }) }), checkedItemID: e3, setCheckedItemID: t2, data: n2.payload.user.identities });
};
var po = ({ checkedItemID: e3, setCheckedItemID: t2, flowState: n2, onState: o2 }) => {
  var a2, r2;
  const { t: s2 } = (0, m.useContext)(v.TranslateContext);
  return i(Gn, { name: "connect-account-dropdown", title: s2("labels.connectAccount"), checkedItemID: e3, setCheckedItemID: t2, children: [i(eo, { flowError: null === (a2 = n2.actions.connect_thirdparty_oauth_provider.inputs.provider) || void 0 === a2 ? void 0 : a2.error }), null === (r2 = n2.actions.connect_thirdparty_oauth_provider.inputs.provider.allowed_values) || void 0 === r2 ? void 0 : r2.map((e4) => i(Gt, { flowAction: n2.actions.connect_thirdparty_oauth_provider, onSubmit: (t3) => ((e5, t4) => (function(e6, t5, n3, o3) {
    return new (n3 || (n3 = Promise))(function(a3, r3) {
      function i2(e7) {
        try {
          c2(o3.next(e7));
        } catch (e8) {
          r3(e8);
        }
      }
      function s3(e7) {
        try {
          c2(o3.throw(e7));
        } catch (e8) {
          r3(e8);
        }
      }
      function c2(e7) {
        var t6;
        e7.done ? a3(e7.value) : (t6 = e7.value, t6 instanceof n3 ? t6 : new n3(function(e8) {
          e8(t6);
        })).then(i2, s3);
      }
      c2((o3 = o3.apply(e6, t5 || [])).next());
    });
  })(void 0, void 0, void 0, function* () {
    e5.preventDefault();
    const a3 = Ge();
    et(a3);
    try {
      const e6 = yield n2.actions.connect_thirdparty_oauth_provider.run({ provider: t4, redirect_to: window.location.href, code_verifier: a3 });
      return e6.error && nt(), o2(e6);
    } catch (e6) {
      throw nt(), e6;
    }
  }))(t3, e4.value), children: i(en, { icon: e4.value.startsWith("custom_") ? "customProvider" : e4.value, children: e4.name }, e4) }, e4.value))] });
};
var fo = function(e3, t2, n2, o2) {
  return new (n2 || (n2 = Promise))(function(a2, r2) {
    function i2(e4) {
      try {
        c2(o2.next(e4));
      } catch (e5) {
        r2(e5);
      }
    }
    function s2(e4) {
      try {
        c2(o2.throw(e4));
      } catch (e5) {
        r2(e5);
      }
    }
    function c2(e4) {
      var t3;
      e4.done ? a2(e4.value) : (t3 = e4.value, t3 instanceof n2 ? t3 : new n2(function(e5) {
        e5(t3);
      })).then(i2, s2);
    }
    c2((o2 = o2.apply(e3, t2 || [])).next());
  });
};
var _o = (e3) => {
  var t2, n2, o2, r2, s2, c2, l2;
  const { t: d2 } = (0, m.useContext)(v.TranslateContext), { setPage: u2 } = (0, m.useContext)(Uo), { flowState: h2 } = Vt(e3.state), [p2, f2] = (0, m.useState)(""), _2 = (e4) => fo(void 0, void 0, void 0, function* () {
    (null == e4 ? void 0 : e4.error) || (f2(null), yield new Promise((e5) => setTimeout(e5, 360))), e4.dispatchAfterStateChangeEvent();
  }), g2 = (e4, t3, n3) => fo(void 0, void 0, void 0, function* () {
    e4.preventDefault();
    const o3 = yield h2.actions.webauthn_credential_rename.run({ passkey_id: t3, passkey_name: n3 }, { dispatchAfterStateChangeEvent: false });
    return _2(o3);
  }), y2 = (t3) => (t3.preventDefault(), u2(i(_o, { state: h2, enablePasskeys: e3.enablePasskeys })), Promise.resolve());
  return i(nn, { children: [i(un, { state: "form_data_invalid_error" !== (null === (t2 = null == h2 ? void 0 : h2.error) || void 0 === t2 ? void 0 : t2.code) ? h2 : null }), h2.actions.username_create.enabled || h2.actions.username_update.enabled || h2.actions.username_delete.enabled ? i(a.Fragment, { children: [i(_n, { children: d2("labels.username") }), h2.payload.user.username ? i(In, { children: i("b", { children: h2.payload.user.username.username }) }) : null, i(In, { children: h2.actions.username_create.enabled || h2.actions.username_update.enabled ? i(io, { onState: _2, flowState: h2, checkedItemID: p2, setCheckedItemID: f2 }) : null })] }) : null, (null === (o2 = null === (n2 = h2.payload) || void 0 === n2 ? void 0 : n2.user) || void 0 === o2 ? void 0 : o2.emails) || h2.actions.email_create.enabled ? i(a.Fragment, { children: [i(_n, { children: d2("headlines.profileEmails") }), i(In, { children: [i(Qn, { flowState: h2, onState: _2, checkedItemID: p2, setCheckedItemID: f2 }), h2.actions.email_create.enabled ? i(to, { flowState: h2, onState: _2, checkedItemID: p2, setCheckedItemID: f2 }) : null] })] }) : null, h2.actions.password_create.enabled || h2.actions.password_update.enabled ? i(a.Fragment, { children: [i(_n, { children: d2("headlines.profilePassword") }), i(In, { children: i(oo, { flowState: h2, onState: _2, checkedItemID: p2, setCheckedItemID: f2 }) })] }) : null, e3.enablePasskeys && ((null === (s2 = null === (r2 = h2.payload) || void 0 === r2 ? void 0 : r2.user) || void 0 === s2 ? void 0 : s2.passkeys) || h2.actions.webauthn_credential_create.enabled) ? i(a.Fragment, { children: [i(_n, { children: d2("headlines.profilePasskeys") }), i(In, { children: [i(Xn, { flowState: h2, onBack: y2, onCredentialNameSubmit: g2, onCredentialDelete: (e4, t3) => fo(void 0, void 0, void 0, function* () {
    e4.preventDefault();
    const n3 = yield h2.actions.webauthn_credential_delete.run({ passkey_id: t3 }, { dispatchAfterStateChangeEvent: false });
    return _2(n3);
  }), credentials: h2.payload.user.passkeys, checkedItemID: p2, setCheckedItemID: f2, allowCredentialDeletion: !!h2.actions.webauthn_credential_delete.enabled, credentialType: "passkey" }), h2.actions.webauthn_credential_create.enabled ? i(ao, { flowState: h2, onState: _2, credentialType: "passkey", checkedItemID: p2, setCheckedItemID: f2 }) : null] })] }) : null, (null === (c2 = h2.payload.user.mfa_config) || void 0 === c2 ? void 0 : c2.security_keys_enabled) ? i(a.Fragment, { children: [i(_n, { children: d2("headlines.securityKeys") }), i(In, { children: [i(Xn, { onBack: y2, flowState: h2, onCredentialNameSubmit: g2, onCredentialDelete: (e4, t3) => fo(void 0, void 0, void 0, function* () {
    e4.preventDefault();
    const n3 = yield h2.actions.security_key_delete.run({ security_key_id: t3 }, { dispatchAfterStateChangeEvent: false });
    return _2(n3);
  }), credentials: h2.payload.user.security_keys, checkedItemID: p2, setCheckedItemID: f2, allowCredentialDeletion: !!h2.actions.security_key_delete.enabled, credentialType: "security-key" }), h2.actions.security_key_create.enabled ? i(ao, { flowState: h2, onState: _2, credentialType: "security-key", checkedItemID: p2, setCheckedItemID: f2 }) : null] })] }) : null, (null === (l2 = h2.payload.user.mfa_config) || void 0 === l2 ? void 0 : l2.totp_enabled) ? i(a.Fragment, { children: [i(_n, { children: d2("headlines.authenticatorApp") }), i(In, { children: i(uo, { onState: _2, flowState: h2, checkedItemID: p2, setCheckedItemID: f2 }) })] }) : null, h2.actions.connect_thirdparty_oauth_provider.enabled || h2.actions.disconnect_thirdparty_oauth_provider.enabled ? i(a.Fragment, { children: [i(_n, { children: d2("headlines.connectedAccounts") }), i(ho, { flowState: h2, onState: _2, checkedItemID: p2, setCheckedItemID: f2 }), h2.actions.connect_thirdparty_oauth_provider.enabled ? i(po, { setCheckedItemID: f2, flowState: h2, onState: _2, checkedItemID: p2 }) : null] }) : null, h2.payload.sessions ? i(a.Fragment, { children: [i(_n, { children: d2("headlines.profileSessions") }), i(In, { children: i(co, { flowState: h2, onState: _2, checkedItemID: p2, setCheckedItemID: f2 }) })] }) : null, h2.actions.account_delete.enabled ? i(a.Fragment, { children: [i(Sn, {}), i(In, { children: i(sn, {}) }), i(In, { children: i(Gt, { onSubmit: (e4) => (e4.preventDefault(), u2(i(so, { onBack: y2, state: h2 })), Promise.resolve()), flowAction: h2.actions.account_delete, children: i(en, { dangerous: true, children: d2("headlines.deleteAccount") }) }) })] }) : null] });
};
var vo = _o;
var mo = ({ state: e3, error: t2 }) => {
  const { t: n2 } = (0, m.useContext)(v.TranslateContext), { init: o2, componentName: a2 } = (0, m.useContext)(Uo), [r2, s2] = (0, m.useState)(false), c2 = (0, m.useCallback)(() => o2(a2), [a2, o2]), { flowState: l2 } = Vt(e3);
  return (0, m.useEffect)(() => (addEventListener("hankoAuthSuccess", c2), () => {
    removeEventListener("hankoAuthSuccess", c2);
  }), [c2]), i(nn, { children: [i(_n, { children: n2("headlines.error") }), i(un, { state: l2, error: t2 }), i(Gt, { onSubmit: (e4) => {
    e4.preventDefault(), s2(true), c2();
  }, children: i(en, { isLoading: r2, children: n2("labels.continue") }) })] });
};
var go = function(e3, t2, n2, o2) {
  return new (n2 || (n2 = Promise))(function(a2, r2) {
    function i2(e4) {
      try {
        c2(o2.next(e4));
      } catch (e5) {
        r2(e5);
      }
    }
    function s2(e4) {
      try {
        c2(o2.throw(e4));
      } catch (e5) {
        r2(e5);
      }
    }
    function c2(e4) {
      var t3;
      e4.done ? a2(e4.value) : (t3 = e4.value, t3 instanceof n2 ? t3 : new n2(function(e5) {
        e5(t3);
      })).then(i2, s2);
    }
    c2((o2 = o2.apply(e3, t2 || [])).next());
  });
};
var yo = (e3) => {
  const { t: t2 } = (0, m.useContext)(v.TranslateContext), { flowState: n2 } = Vt(e3.state), [o2, r2] = (0, m.useState)();
  return i(a.Fragment, { children: [i(nn, { children: [i(_n, { children: t2("headlines.createEmail") }), i(un, { state: n2 }), i(Gt, { onSubmit: (e4) => go(void 0, void 0, void 0, function* () {
    return e4.preventDefault(), n2.actions.email_address_set.run({ email: o2 });
  }), flowAction: n2.actions.email_address_set, children: [i(tn, { type: "email", autoComplete: "email", autoCorrect: "off", flowInput: n2.actions.email_address_set.inputs.email, onInput: (e4) => go(void 0, void 0, void 0, function* () {
    e4.target instanceof HTMLInputElement && r2(e4.target.value);
  }), placeholder: t2("labels.email"), pattern: "^.*[^0-9]+$", value: o2 }), i(en, { children: t2("labels.continue") })] })] }), i(kn, { hidden: !n2.actions.skip.enabled, children: [i("span", { hidden: true }), i(bn, { flowAction: n2.actions.skip, loadingSpinnerPosition: "left", children: t2("labels.skip") })] })] });
};
var bo = function(e3, t2, n2, o2) {
  return new (n2 || (n2 = Promise))(function(a2, r2) {
    function i2(e4) {
      try {
        c2(o2.next(e4));
      } catch (e5) {
        r2(e5);
      }
    }
    function s2(e4) {
      try {
        c2(o2.throw(e4));
      } catch (e5) {
        r2(e5);
      }
    }
    function c2(e4) {
      var t3;
      e4.done ? a2(e4.value) : (t3 = e4.value, t3 instanceof n2 ? t3 : new n2(function(e5) {
        e5(t3);
      })).then(i2, s2);
    }
    c2((o2 = o2.apply(e3, t2 || [])).next());
  });
};
var ko = (e3) => {
  const { t: t2 } = (0, m.useContext)(v.TranslateContext), { flowState: n2 } = Vt(e3.state), [o2, r2] = (0, m.useState)();
  return i(a.Fragment, { children: [i(nn, { children: [i(_n, { children: t2("headlines.createUsername") }), i(un, { state: n2 }), i(Gt, { flowAction: n2.actions.username_create, onSubmit: (e4) => bo(void 0, void 0, void 0, function* () {
    return e4.preventDefault(), n2.actions.username_create.run({ username: o2 });
  }), children: [i(tn, { type: "text", autoComplete: "username", autoCorrect: "off", flowInput: n2.actions.username_create.inputs.username, onInput: (e4) => bo(void 0, void 0, void 0, function* () {
    e4.target instanceof HTMLInputElement && r2(e4.target.value);
  }), value: o2, placeholder: t2("labels.username") }), i(en, { children: t2("labels.continue") })] })] }), i(kn, { hidden: !n2.actions.skip.enabled, children: [i("span", { hidden: true }), i(bn, { flowAction: n2.actions.skip, loadingSpinnerPosition: "left", children: t2("labels.skip") })] })] });
};
var wo = (e3) => {
  const { t: t2 } = (0, m.useContext)(v.TranslateContext), { flowState: n2 } = Vt(e3.state);
  return i(a.Fragment, { children: [i(nn, { children: [i(_n, { children: t2("headlines.setupLoginMethod") }), i(un, { flowError: null == n2 ? void 0 : n2.error }), i(In, { children: t2("texts.selectLoginMethodForFutureLogins") }), i(Gt, { flowAction: n2.actions.continue_to_passkey_registration, children: i(en, { secondary: true, icon: "passkey", children: t2("labels.passkey") }) }), i(Gt, { flowAction: n2.actions.continue_to_password_registration, children: i(en, { secondary: true, icon: "password", children: t2("labels.password") }) })] }), i(kn, { hidden: !n2.actions.back.enabled && !n2.actions.skip.enabled, children: [i(bn, { loadingSpinnerPosition: "right", flowAction: n2.actions.back, children: t2("labels.back") }), i(bn, { loadingSpinnerPosition: "left", flowAction: n2.actions.skip, children: t2("labels.skip") })] })] });
};
var So = function(e3, t2, n2, o2) {
  return new (n2 || (n2 = Promise))(function(a2, r2) {
    function i2(e4) {
      try {
        c2(o2.next(e4));
      } catch (e5) {
        r2(e5);
      }
    }
    function s2(e4) {
      try {
        c2(o2.throw(e4));
      } catch (e5) {
        r2(e5);
      }
    }
    function c2(e4) {
      var t3;
      e4.done ? a2(e4.value) : (t3 = e4.value, t3 instanceof n2 ? t3 : new n2(function(e5) {
        e5(t3);
      })).then(i2, s2);
    }
    c2((o2 = o2.apply(e3, t2 || [])).next());
  });
};
var xo = (e3) => {
  const { t: t2 } = (0, m.useContext)(v.TranslateContext), { flowState: n2 } = Vt(e3.state), [o2, r2] = (0, m.useState)([]), s2 = (0, m.useCallback)((e4) => So(void 0, void 0, void 0, function* () {
    return n2.actions.otp_code_validate.run({ otp_code: e4 });
  }), [n2]);
  return (0, m.useEffect)(() => {
    r2([]);
  }, [n2]), i(a.Fragment, { children: [i(nn, { children: [i(_n, { children: t2("headlines.otpLogin") }), i(un, { state: n2 }), i(In, { children: t2("texts.otpLogin") }), i(Gt, { flowAction: n2.actions.otp_code_validate, onSubmit: (e4) => So(void 0, void 0, void 0, function* () {
    return e4.preventDefault(), s2(o2.join(""));
  }), children: [i(Dn, { onInput: (e4) => {
    if (r2(e4), 6 === e4.filter((e5) => "" !== e5).length) return s2(e4.join(""));
  }, passcodeDigits: o2, numberOfInputs: 6 }), i(en, { children: t2("labels.continue") })] })] }), i(kn, { hidden: !n2.actions.continue_to_login_security_key.enabled, children: i(bn, { loadingSpinnerPosition: "right", flowAction: n2.actions.continue_to_login_security_key, children: t2("labels.useAnotherMethod") }) })] });
};
var Co = (e3) => {
  const { t: t2 } = (0, m.useContext)(v.TranslateContext), { flowState: n2 } = Vt(e3.state);
  return i(a.Fragment, { children: [i(nn, { children: [i(_n, { children: t2("headlines.securityKeyLogin") }), i(un, { state: n2 }), i(In, { children: t2("texts.securityKeyLogin") }), i(Gt, { flowAction: n2.actions.webauthn_generate_request_options, children: i(en, { autofocus: true, icon: "securityKey", children: t2("labels.securityKeyUse") }) })] }), i(kn, { hidden: !n2.actions.continue_to_login_otp.enabled, children: i(bn, { loadingSpinnerPosition: "right", flowAction: n2.actions.continue_to_login_otp, children: t2("labels.useAnotherMethod") }) })] });
};
var Ao = (e3) => {
  const { t: t2 } = (0, m.useContext)(v.TranslateContext), { flowState: n2 } = Vt(e3.state), o2 = (0, m.useMemo)(() => {
    const { actions: e4 } = n2;
    return e4.continue_to_security_key_creation.enabled && !e4.continue_to_otp_secret_creation.enabled ? e4.continue_to_security_key_creation : !e4.continue_to_security_key_creation.enabled && e4.continue_to_otp_secret_creation.enabled ? e4.continue_to_otp_secret_creation : void 0;
  }, [n2]);
  return i(a.Fragment, { children: [i(nn, { children: [i(_n, { children: t2("headlines.mfaSetUp") }), i(un, { flowError: null == n2 ? void 0 : n2.error }), i(In, { children: t2("texts.mfaSetUp") }), o2 ? i(Gt, { flowAction: o2, children: i(en, { children: t2("labels.continue") }) }) : i(a.Fragment, { children: [i(Gt, { flowAction: n2.actions.continue_to_security_key_creation, children: i(en, { secondary: true, icon: "securityKey", children: t2("labels.securityKey") }) }), i(Gt, { flowAction: n2.actions.continue_to_otp_secret_creation, children: i(en, { secondary: true, icon: "qrCodeScanner", children: t2("labels.authenticatorApp") }) })] })] }), i(kn, { children: [i(bn, { loadingSpinnerPosition: "right", flowAction: n2.actions.back, children: t2("labels.back") }), i(bn, { loadingSpinnerPosition: "left", flowAction: n2.actions.skip, children: t2("labels.skip") })] })] });
};
var Io = n(8);
var Eo = {};
Eo.setAttributes = _t(), Eo.insert = (e3) => {
  window._hankoStyle = e3;
}, Eo.domAPI = pt(), Eo.insertStyleElement = mt(), ut()(Io.A, Eo);
var Po = Io.A && Io.A.locals ? Io.A.locals : void 0;
var Oo = ({ children: e3, text: t2 }) => {
  const { t: n2 } = (0, m.useContext)(v.TranslateContext), [o2, a2] = (0, m.useState)(false);
  return i("section", { className: bt.clipboardContainer, children: [i("div", { children: [e3, "\xA0"] }), i("div", { className: bt.clipboardIcon, onClick: (e4) => (function(e5, t3, n3, o3) {
    return new (n3 || (n3 = Promise))(function(a3, r2) {
      function i2(e6) {
        try {
          c2(o3.next(e6));
        } catch (e7) {
          r2(e7);
        }
      }
      function s2(e6) {
        try {
          c2(o3.throw(e6));
        } catch (e7) {
          r2(e7);
        }
      }
      function c2(e6) {
        var t4;
        e6.done ? a3(e6.value) : (t4 = e6.value, t4 instanceof n3 ? t4 : new n3(function(e7) {
          e7(t4);
        })).then(i2, s2);
      }
      c2((o3 = o3.apply(e5, t3 || [])).next());
    });
  })(void 0, void 0, void 0, function* () {
    e4.preventDefault();
    try {
      yield navigator.clipboard.writeText(t2), a2(true), setTimeout(() => a2(false), 1500);
    } catch (e5) {
      console.error("Failed to copy: ", e5);
    }
  }), children: o2 ? i("span", { children: ["- ", n2("labels.copied")] }) : i(Kt, { name: "copy", secondary: true, size: 13 }) })] });
};
var Do = ({ src: e3, secret: t2 }) => {
  const { t: n2 } = (0, m.useContext)(v.TranslateContext);
  return i("div", { className: Po.otpCreationDetails, children: [i("img", { alt: "QR-Code", src: e3 }), i(Sn, {}), i(Oo, { text: t2, children: n2("texts.otpSecretKey") }), i("div", { children: t2 })] });
};
var To = function(e3, t2, n2, o2) {
  return new (n2 || (n2 = Promise))(function(a2, r2) {
    function i2(e4) {
      try {
        c2(o2.next(e4));
      } catch (e5) {
        r2(e5);
      }
    }
    function s2(e4) {
      try {
        c2(o2.throw(e4));
      } catch (e5) {
        r2(e5);
      }
    }
    function c2(e4) {
      var t3;
      e4.done ? a2(e4.value) : (t3 = e4.value, t3 instanceof n2 ? t3 : new n2(function(e5) {
        e5(t3);
      })).then(i2, s2);
    }
    c2((o2 = o2.apply(e3, t2 || [])).next());
  });
};
var No = (e3) => {
  const { t: t2 } = (0, m.useContext)(v.TranslateContext), { flowState: n2 } = Vt(e3.state), [o2, r2] = (0, m.useState)([]), s2 = (0, m.useCallback)((e4) => To(void 0, void 0, void 0, function* () {
    return n2.actions.otp_code_verify.run({ otp_code: e4 });
  }), [n2]);
  return (0, m.useEffect)(() => {
    var e4;
    "passcode_invalid" === (null === (e4 = n2.error) || void 0 === e4 ? void 0 : e4.code) && r2([]);
  }, [n2]), i(a.Fragment, { children: [i(nn, { children: [i(_n, { children: t2("headlines.otpSetUp") }), i(un, { state: n2 }), i(In, { children: t2("texts.otpScanQRCode") }), i(Do, { src: n2.payload.otp_image_source, secret: n2.payload.otp_secret }), i(In, { children: t2("texts.otpEnterVerificationCode") }), i(Gt, { flowAction: n2.actions.otp_code_verify, onSubmit: (e4) => To(void 0, void 0, void 0, function* () {
    return e4.preventDefault(), s2(o2.join(""));
  }), children: [i(Dn, { onInput: (e4) => {
    if (r2(e4), 6 === e4.filter((e5) => "" !== e5).length) return s2(e4.join(""));
  }, passcodeDigits: o2, numberOfInputs: 6 }), i(en, { children: t2("labels.continue") })] })] }), i(kn, { children: i(bn, { flowAction: n2.actions.back, loadingSpinnerPosition: "right", children: t2("labels.back") }) })] });
};
var Lo = (e3) => {
  const { t: t2 } = (0, m.useContext)(v.TranslateContext), { flowState: n2 } = Vt(e3.state);
  return i(a.Fragment, { children: [i(nn, { children: [i(_n, { children: t2("headlines.securityKeySetUp") }), i(un, { state: n2 }), i(In, { children: t2("texts.securityKeySetUp") }), i(Gt, { flowAction: n2.actions.webauthn_generate_creation_options, children: i(en, { autofocus: true, icon: "securityKey", children: t2("labels.createSecurityKey") }) })] }), i(kn, { hidden: !n2.actions.back.enabled, children: i(bn, { loadingSpinnerPosition: "right", flowAction: n2.actions.back, children: t2("labels.back") }) })] });
};
var jo = (e3) => {
  const { t: t2 } = (0, m.useContext)(v.TranslateContext), { flowState: n2 } = Vt(e3.state);
  return i(a.Fragment, { children: [i(nn, { children: [i(_n, { children: t2("headlines.trustDevice") }), i(un, { flowError: null == n2 ? void 0 : n2.error }), i(In, { children: t2("texts.trustDevice") }), i(Gt, { flowAction: n2.actions.trust_device, children: i(en, { children: t2("labels.trustDevice") }) })] }), i(kn, { children: [i(bn, { flowAction: n2.actions.back, loadingSpinnerPosition: "right", children: t2("labels.back") }), i(bn, { flowAction: n2.actions.skip, loadingSpinnerPosition: "left", children: t2("labels.skip") })] })] });
};
var Mo = function(e3, t2, n2, o2) {
  return new (n2 || (n2 = Promise))(function(a2, r2) {
    function i2(e4) {
      try {
        c2(o2.next(e4));
      } catch (e5) {
        r2(e5);
      }
    }
    function s2(e4) {
      try {
        c2(o2.throw(e4));
      } catch (e5) {
        r2(e5);
      }
    }
    function c2(e4) {
      var t3;
      e4.done ? a2(e4.value) : (t3 = e4.value, t3 instanceof n2 ? t3 : new n2(function(e5) {
        e5(t3);
      })).then(i2, s2);
    }
    c2((o2 = o2.apply(e3, t2 || [])).next());
  });
};
var Uo = (0, a.createContext)(null);
var Fo = (e3) => {
  var t2, { lang: n2, prefilledEmail: o2, prefilledUsername: r2, globalOptions: s2, createWebauthnAbortSignal: c2, nonce: l2 } = e3, d2 = (function(e4, t3) {
    var n3 = {};
    for (var o3 in e4) Object.prototype.hasOwnProperty.call(e4, o3) && t3.indexOf(o3) < 0 && (n3[o3] = e4[o3]);
    if (null != e4 && "function" == typeof Object.getOwnPropertySymbols) {
      var a2 = 0;
      for (o3 = Object.getOwnPropertySymbols(e4); a2 < o3.length; a2++) t3.indexOf(o3[a2]) < 0 && Object.prototype.propertyIsEnumerable.call(e4, o3[a2]) && (n3[o3[a2]] = e4[o3[a2]]);
    }
    return n3;
  })(e3, ["lang", "prefilledEmail", "prefilledUsername", "globalOptions", "createWebauthnAbortSignal", "nonce"]);
  const { hanko: u2, injectStyles: h2, hidePasskeyButtonOnLogin: p2, translations: f2, translationsLocation: _2, fallbackLanguage: g2 } = s2;
  u2.setLang((null == n2 ? void 0 : n2.toString()) || g2);
  const y2 = (0, m.useRef)(null), b2 = (0, m.useMemo)(() => `${s2.storageKey}_last_login`, [s2.storageKey]), [k2, w2] = (0, m.useState)(d2.componentName), [S2, x2] = (0, m.useState)(null !== (t2 = d2.mode) && void 0 !== t2 ? t2 : "login"), C2 = (0, m.useRef)(false), [A2, I2] = (0, m.useState)(false), E2 = (0, m.useMemo)(() => ({ auth: S2, login: "login", registration: "registration", profile: "profile", events: null }), [S2]), P2 = (0, m.useMemo)(() => i(Zt, {}), []), [O2, D2] = (0, m.useState)(P2), [, T2] = (0, m.useState)(u2), [N2, L2] = (0, m.useState)(), [j2, M2] = (0, m.useState)({ email: o2, username: r2 }), U2 = function(e4, t3) {
    var n3;
    null === (n3 = y2.current) || void 0 === n3 || n3.dispatchEvent(new CustomEvent(e4, { detail: t3, bubbles: false, composed: true }));
  }, F2 = (0, m.useCallback)((e4) => E2[k2] == e4.flowName, [E2, k2, S2]), W2 = (e4) => {
    D2(i(mo, { error: e4 instanceof ne ? e4 : new oe(e4) }));
  };
  (0, m.useMemo)(() => u2.onBeforeStateChange(({ state: e4 }) => {
    F2(e4) && M2((e5) => Object.assign(Object.assign({}, e5), { isDisabled: true, error: void 0 }));
  }), [u2, F2]), (0, m.useEffect)(() => {
    M2((e4) => Object.assign(Object.assign(Object.assign({}, e4), o2 && { email: o2 }), r2 && { username: r2 }));
  }, [o2, r2]), (0, m.useEffect)(() => u2.onAfterStateChange((e4) => Mo(void 0, [e4], void 0, function* ({ state: e5 }) {
    var t3;
    if (F2(e5)) switch (["onboarding_verify_passkey_attestation", "webauthn_credential_verification", "login_passkey", "thirdparty"].includes(e5.name) || M2((e6) => Object.assign(Object.assign({}, e6), { isDisabled: false })), e5.name) {
      case "login_init":
        D2(i(Pn, { state: e5 })), e5.passkeyAutofillActivation();
        break;
      case "passcode_confirmation":
        D2(i(Nn, { state: e5 }));
        break;
      case "login_otp":
        D2(i(xo, { state: e5 }));
        break;
      case "onboarding_create_passkey":
        D2(i(Ln, { state: e5 }));
        break;
      case "login_password":
        D2(i(Mn, { state: e5 }));
        break;
      case "login_password_recovery":
        D2(i(Fn, { state: e5 }));
        break;
      case "login_security_key":
        D2(i(Co, { state: e5 }));
        break;
      case "mfa_method_chooser":
        D2(i(Ao, { state: e5 }));
        break;
      case "mfa_otp_secret_creation":
        D2(i(No, { state: e5 }));
        break;
      case "mfa_security_key_creation":
        D2(i(Lo, { state: e5 }));
        break;
      case "login_method_chooser":
        D2(i(Wn, { state: e5 }));
        break;
      case "registration_init":
        D2(i(Rn, { state: e5 }));
        break;
      case "password_creation":
        D2(i(zn, { state: e5 }));
        break;
      case "success":
        (null === (t3 = e5.payload) || void 0 === t3 ? void 0 : t3.last_login) && localStorage.setItem(b2, JSON.stringify(e5.payload.last_login)), e5.autoStep();
        break;
      case "profile_init":
        D2(i(vo, { state: e5, enablePasskeys: s2.enablePasskeys }));
        break;
      case "error":
        D2(i(mo, { state: e5 }));
        break;
      case "onboarding_email":
        D2(i(yo, { state: e5 }));
        break;
      case "onboarding_username":
        D2(i(ko, { state: e5 }));
        break;
      case "credential_onboarding_chooser":
        D2(i(wo, { state: e5 }));
        break;
      case "device_trust":
        D2(i(jo, { state: e5 }));
    }
  })), [k2, E2]);
  const H2 = (0, m.useCallback)((e4) => Mo(void 0, void 0, void 0, function* () {
    M2((e5) => Object.assign(Object.assign({}, e5), { isDisabled: true }));
    const t3 = localStorage.getItem(b2);
    t3 && L2(JSON.parse(t3));
    const n3 = { excludeAutoSteps: ["success"], cacheKey: "hanko-auth-flow-state", dispatchAfterStateChangeEvent: false };
    if ("idp_initiated" === new URLSearchParams(window.location.search).get("saml_hint")) x2("token_exchange"), yield u2.createState("token_exchange", Object.assign(Object.assign({}, n3), { dispatchAfterStateChangeEvent: true }));
    else {
      const t4 = yield u2.createState(e4, n3);
      x2(t4.flowName), setTimeout(() => t4.dispatchAfterStateChangeEvent(), 500);
    }
  }), []), R2 = (0, m.useCallback)((e4) => {
    w2(e4);
    const t3 = E2[e4];
    t3 && H2(t3).catch(W2);
  }, [E2]);
  (0, m.useEffect)(() => {
    if (!C2.current) {
      const e4 = setTimeout(() => {
        var e5;
        x2(null !== (e5 = d2.mode) && void 0 !== e5 ? e5 : "login"), I2(true);
      }, 0);
      return () => clearTimeout(e4);
    }
  }, [d2.mode]), (0, m.useEffect)(() => {
    A2 && !C2.current && (C2.current = true, R2(k2));
  }, [A2, S2, k2, R2]), (0, m.useEffect)(() => {
    u2.onUserDeleted(() => {
      U2("onUserDeleted");
    }), u2.onSessionCreated((e4) => {
      U2("onSessionCreated", e4);
    }), u2.onSessionExpired(() => {
      U2("onSessionExpired");
    }), u2.onUserLoggedOut(() => {
      U2("onUserLoggedOut");
    }), u2.onBeforeStateChange((e4) => {
      U2("onBeforeStateChange", e4);
    }), u2.onAfterStateChange((e4) => {
      U2("onAfterStateChange", e4);
    });
  }, [u2]), (0, m.useMemo)(() => {
    const e4 = () => {
      R2(k2);
    };
    ["auth", "login", "registration"].includes(k2) ? (u2.onUserLoggedOut(e4), u2.onSessionExpired(e4), u2.onUserDeleted(e4)) : "profile" === k2 && u2.onSessionCreated(e4);
  }, [k2, u2, R2]);
  const q2 = Uo.Provider, z2 = v.TranslateProvider, K2 = kt;
  return i(q2, { value: { init: R2, initialComponentName: d2.componentName, setUIState: M2, uiState: j2, hanko: u2, setHanko: T2, lang: (null == n2 ? void 0 : n2.toString()) || g2, prefilledEmail: o2, prefilledUsername: r2, componentName: k2, setComponentName: w2, hidePasskeyButtonOnLogin: p2, page: O2, setPage: D2, lastLogin: N2, isOwnFlow: F2 }, children: i(z2, { translations: f2, fallbackLang: g2, root: _2, children: i(K2, { ref: y2, children: "events" !== k2 ? i(a.Fragment, { children: [h2 ? i("style", { nonce: l2 || void 0, dangerouslySetInnerHTML: { __html: window._hankoStyle.innerHTML } }) : null, O2] }) : null }) }) });
};
var Wo = { en: n(6).en };
var Ho = function(e3, t2, n2, o2) {
  return new (n2 || (n2 = Promise))(function(a2, r2) {
    function i2(e4) {
      try {
        c2(o2.next(e4));
      } catch (e5) {
        r2(e5);
      }
    }
    function s2(e4) {
      try {
        c2(o2.throw(e4));
      } catch (e5) {
        r2(e5);
      }
    }
    function c2(e4) {
      var t3;
      e4.done ? a2(e4.value) : (t3 = e4.value, t3 instanceof n2 ? t3 : new n2(function(e5) {
        e5(t3);
      })).then(i2, s2);
    }
    c2((o2 = o2.apply(e3, t2 || [])).next());
  });
};
var Ro = {};
var qo = (e3, t2) => {
  var n2;
  const o2 = null === (n2 = document.getElementsByTagName(`hanko-${e3}`).item(0)) || void 0 === n2 ? void 0 : n2.nonce;
  return i(Fo, Object.assign({ componentName: e3, globalOptions: Ro, createWebauthnAbortSignal: Jo }, t2, { nonce: o2 }));
};
var zo = (e3) => qo("auth", e3);
var Ko = (e3) => qo("login", e3);
var Bo = (e3) => qo("registration", e3);
var Zo = (e3) => qo("profile", e3);
var Vo = (e3) => qo("events", e3);
var $o = new AbortController();
var Jo = () => ($o && $o.abort(), $o = new AbortController(), $o.signal);
var Qo = (e3) => Ho(void 0, [e3], void 0, function* ({ tagName: e4, entryComponent: t2, shadow: n2 = true, observedAttributes: o2 }) {
  customElements.get(e4) || (function(e5, t3, n3, o3) {
    function a2() {
      var t4 = Reflect.construct(HTMLElement, [], a2);
      return t4._vdomComponent = e5, t4._root = o3 && o3.shadow ? t4.attachShadow({ mode: "open" }) : t4, t4;
    }
    (a2.prototype = Object.create(HTMLElement.prototype)).constructor = a2, a2.prototype.connectedCallback = d, a2.prototype.attributeChangedCallback = h, a2.prototype.disconnectedCallback = p, n3 = n3 || e5.observedAttributes || Object.keys(e5.propTypes || {}), a2.observedAttributes = n3, n3.forEach(function(e6) {
      Object.defineProperty(a2.prototype, e6, { get: function() {
        var t4, n4, o4, a3;
        return null != (t4 = null == (n4 = this._vdom) || null == (o4 = n4.props) ? void 0 : o4[e6]) ? t4 : null == (a3 = this._props) ? void 0 : a3[e6];
      }, set: function(t4) {
        this._vdom ? this.attributeChangedCallback(e6, null, t4) : (this._props || (this._props = {}), this._props[e6] = t4, this.connectedCallback());
        var n4 = typeof t4;
        null != t4 && "string" !== n4 && "boolean" !== n4 && "number" !== n4 || this.setAttribute(e6, t4);
      } });
    }), customElements.define(t3 || e5.tagName || e5.displayName || e5.name, a2);
  })(t2, e4, o2, { shadow: n2 });
});
var Yo = (e3, ...t2) => Ho(void 0, [e3, ...t2], void 0, function* (e4, t3 = {}) {
  const n2 = ["api", "lang", "prefilled-email", "entry", "mode"];
  return t3 = Object.assign({ shadow: true, injectStyles: true, enablePasskeys: true, hidePasskeyButtonOnLogin: false, translations: null, translationsLocation: "/i18n", fallbackLanguage: "en", storageKey: "hanko", sessionCheckInterval: 3e4 }, t3), Ro.hanko = new lt(e4, { cookieName: t3.storageKey, cookieDomain: t3.cookieDomain, cookieSameSite: t3.cookieSameSite, localStorageKey: t3.storageKey, sessionCheckInterval: t3.sessionCheckInterval, sessionTokenLocation: t3.sessionTokenLocation }), Ro.injectStyles = t3.injectStyles, Ro.enablePasskeys = t3.enablePasskeys, Ro.hidePasskeyButtonOnLogin = t3.hidePasskeyButtonOnLogin, Ro.translations = t3.translations || Wo, Ro.translationsLocation = t3.translationsLocation, Ro.fallbackLanguage = t3.fallbackLanguage, Ro.storageKey = t3.storageKey, yield Promise.all([Qo(Object.assign(Object.assign({}, t3), { tagName: "hanko-auth", entryComponent: zo, observedAttributes: n2 })), Qo(Object.assign(Object.assign({}, t3), { tagName: "hanko-login", entryComponent: Ko, observedAttributes: n2 })), Qo(Object.assign(Object.assign({}, t3), { tagName: "hanko-registration", entryComponent: Bo, observedAttributes: n2 })), Qo(Object.assign(Object.assign({}, t3), { tagName: "hanko-profile", entryComponent: Zo, observedAttributes: n2.filter((e5) => ["api", "lang"].includes(e5)) })), Qo(Object.assign(Object.assign({}, t3), { tagName: "hanko-events", entryComponent: Vo, observedAttributes: [] }))]), { hanko: Ro.hanko };
});

// src/environments/environment.ts
var environment = {
  production: false,
  hankoApiUrl: "https://d4c70f6b-088c-4080-96c7-f53645649006.hanko.io"
};

// src/app/auth/auth.service.ts
var AuthService = class _AuthService {
  hanko = new lt(environment.hankoApiUrl);
  currentUserSubject = new BehaviorSubject(null);
  currentUser$ = this.currentUserSubject.asObservable();
  constructor() {
    this.checkSession();
    this.hanko.onSessionCreated(() => {
      this.checkSession();
    });
    this.hanko.onSessionExpired(() => {
      this.currentUserSubject.next(null);
    });
  }
  async checkSession() {
    try {
      const session = await this.hanko.validateSession();
      if (session && session.is_valid) {
        this.currentUserSubject.next(session);
      } else {
        this.currentUserSubject.next(null);
      }
    } catch {
      this.currentUserSubject.next(null);
    }
  }
  async isValid() {
    try {
      const session = await this.hanko.validateSession();
      return session.is_valid;
    } catch {
      return false;
    }
  }
  getToken() {
    return this.hanko.getSessionToken();
  }
  async logout() {
    await this.hanko.logout();
    this.currentUserSubject.next(null);
  }
  static \u0275fac = function AuthService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _AuthService)();
  };
  static \u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _AuthService, factory: _AuthService.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(AuthService, [{
    type: Injectable,
    args: [{ providedIn: "root" }]
  }], () => [], null);
})();

export {
  Yo,
  environment,
  AuthService
};
/*! Bundled license information:

@teamhanko/hanko-elements/dist/elements.js:
  (*! For license information please see elements.js.LICENSE.txt *)
*/
//# sourceMappingURL=chunk-3W6OO4XR.js.map
