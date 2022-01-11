"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _ole = require("./ole");

var OLE = _interopRequireWildcard(_ole);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _objectWithoutProperties(obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * name: ABSOLUTE path of a part, word.xml, ppt/slides/slide1.xml
 * folder:absolute folder, ends with "/" or totally empty ""
 * relName:absolute path of a relationship part
 */
var Part = function () {
	function Part(name, doc) {
		_classCallCheck(this, Part);

		this.name = name;
		this.doc = doc;

		var folder = "";
		var relName = "_rels/" + name + ".rels";
		var i = name.lastIndexOf('/');

		if (i !== -1) {
			folder = name.substring(0, i + 1);
			relName = folder + "_rels/" + name.substring(i + 1) + ".rels";
		}

		if (doc.parts[relName]) {
			this.folder = folder;
			this.relName = relName;
			Object.defineProperty(this, "rels", {
				get: function get() {
					return this.doc.getObjectPart(this.relName);
				}
			});
		}
		this._init();
	}

	_createClass(Part, [{
		key: "_init",
		value: function _init() {
			Object.defineProperty(this, "content", {
				configurable: true,
				get: function get() {
					return this.doc.getObjectPart(this.name);
				}
			});
		}
	}, {
		key: "normalizePath",
		value: function normalizePath() {
			var path = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";

			if (path.startsWith("/")) return path.substr(1);
			return this.folder + path;
		}
	}, {
		key: "getRelPart",
		value: function getRelPart(id) {
			var rel = this.rels("Relationship[Id=\"" + id + "\"]");
			var target = rel.attr("Target");
			return new Part(this.normalizePath(target), this.doc);
		}
	}, {
		key: "getRelTarget",
		value: function getRelTarget(type) {
			return this.rels("[Type$=\"" + type + "\"]").attr("Target");
		}
	}, {
		key: "getRelObject",
		value: function getRelObject(target) {
			return this.doc.getObjectPart(this.normalizePath(target));
		}
	}, {
		key: "getRel",
		value: function getRel(id) {
			var rel = this.rels("Relationship[Id=\"" + id + "\"]");
			var target = rel.attr("Target");
			if (rel.attr("TargetMode") === 'External') return { url: target };

			switch (rel.attr("Type").split("/").pop()) {
				case 'image':
					var url = this.doc.getDataPartAsUrl(this.normalizePath(target), "image/*");
					var crc32 = this.doc.getPartCrc32(this.normalizePath(target));
					return { url: url, crc32: crc32 };
				default:
					if (target.endsWith(".xml")) return this.getRelObject(target);else return this.doc.getPart(this.normalizePath(target));
			}
		}
	}, {
		key: "_nextrId",
		value: function _nextrId() {
			return Math.max.apply(Math, _toConsumableArray(this.rels('Relationship').toArray().map(function (a) {
				return parseInt(a.attribs.Id.substring(3));
			}))) + 1;
		}
	}, {
		key: "add",
		value: function add(type, target, data) {
			var rId = "rId" + this._nextrId();
			this.rels("Relationships").append("<Relationship Id=\"" + rId + "\" type=\"" + type + "\" target=\"" + target + "\"/>");
			var partName = this.normalizePath(target);
			this.doc.raw.file(partName, data);
			this.doc.parts[partName] = this.doc.raw.file(partName);
			return rId;
		}
	}, {
		key: "addImage",
		value: function addImage(data) {
			var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : { ext: "jpg", mime: "image/jpg" },
			    ext = _ref.ext,
			    mime = _ref.mime;

			var type = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image";
			var id = "rId" + this._nextrId();

			var targetName = "media/image" + (Math.max.apply(Math, [0].concat(_toConsumableArray(this.rels("Relationship[Type$='image']").toArray().map(function (t) {
				return parseInt(t.attribs.Target.match(/\d+\./) || [0]);
			})))) + 1) + "." + ext;

			var partName = this.normalizePath(targetName);
			this.doc.raw.file(partName, data);
			this.doc.parts[partName] = this.doc.raw.file(partName);

			this.rels("Relationships").append("<Relationship Id=\"" + id + "\" Type=\"" + type + "\" Target=\"" + targetName + "\"/>");

			var DefaultTypes = this.doc.getObjectPart("[Content_Types].xml")("Types");
			var extType = DefaultTypes.find(">Default[Extension='" + ext + "']");
			if (extType.length == 0) {
				DefaultTypes.prepend("<Default Extension=\"" + ext + "\" ContentType=\"" + mime + "\"/>");
			}
			return id;
		}
	}, {
		key: "addExternalImage",
		value: function addExternalImage(url) {
			var type = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image";

			var id = "rId" + this._nextrId();

			this.rels("Relationships").append("<Relationship Id=\"" + id + "\" Type=\"" + type + "\" TargetMode=\"External\" Target=\"" + url + "\"/>");

			return id;
		}
	}, {
		key: "addChunk",
		value: function addChunk(data, relationshipType, contentType, ext) {
			relationshipType = relationshipType || "http://schemas.openxmlformats.org/officeDocument/2006/relationships/aFChunk";
			contentType = contentType || this.doc.constructor.mime;
			ext = ext || this.doc.constructor.ext;

			var id = this._nextrId();
			var rId = "rId" + id;
			var targetName = "chunk/chunk" + id + "." + ext;

			var partName = this.normalizePath(targetName);
			this.doc.raw.file(partName, data);
			this.doc.parts[partName] = this.doc.raw.file(partName);

			this.rels("Relationships").append("<Relationship Id=\"" + rId + "\" Type=\"" + relationshipType + "\" Target=\"" + targetName + "\"/>");

			this.doc.contentTypes.append("<Override PartName=\"/" + partName + "\" ContentType=\"" + contentType + "\"/>");

			return rId;
		}
	}, {
		key: "getRelOleObject",
		value: function getRelOleObject(rid) {
			var rel = this.rels("Relationship[Id=" + rid + "]");
			var type = rel.attr("Type");
			var targetName = rel.attr("Target");
			var data = this.doc.getDataPart(this.normalizePath(targetName));
			switch (type.split("/").pop()) {
				case "oleObject":
					return OLE.parse(data);
				default:
					return data;
			}
		}
	}, {
		key: "removeRel",
		value: function removeRel(id) {
			var rel = this.rels("Relationship[Id=\"" + id + "\"]");
			if (rel.attr("TargetMode") !== "External") {
				var partName = this.normalizePath(rel.attr("Target"));
				this.doc.contentTypes.find("[PartName='/" + partName + "']").remove();
				this.doc.raw.remove(partName);
				delete this.doc.parts[partName];
			}
			rel.remove();
		}
	}, {
		key: "renderNode",
		value: function renderNode(node) {
			var createElement = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : function (type, props, children) {
				type, props, children;
			};

			var _this = this;

			var identify = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : function (node) {
				return node.name.split(":").pop();
			};
			var extra = arguments[3];
			var tagName = node.name,
			    children = node.children,
			    id = node.id,
			    parent = node.parent;

			if (node.type == "text") {
				return node.data;
			}

			var type = tagName;
			var props = {};

			if (identify) {
				var model = null;
				try {
					model = identify(node, this);
				} catch (e) {
					// ignore nodes that can't be identified
				}
				if (!model) return null;

				if (typeof model == "string") {
					type = model;
				} else {
					var content = void 0;
					var _model = model;
					type = _model.type;
					content = _model.children;
					props = _objectWithoutProperties(_model, ["type", "children"]);

					if (content !== undefined) children = content;
				}
			}
			props.key = id;
			props.node = node;
			props.type = type;

			if (extra) Object.assign(props, extra);

			var childElements = children;
			if (Array.isArray(children)) {
				if (children.length) {
					childElements = children.map(function (a) {
						return a ? _this.renderNode(a, createElement, identify) : null;
					}).filter(function (a) {
						return !!a;
					});
				}
			}

			return createElement(type, props, childElements);
		}
	}, {
		key: "$",
		value: function $(node) {
			return this.doc.$(node);
		}
	}]);

	return Part;
}();

exports.default = Part;
module.exports = exports['default'];
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9vcGVueG1sL3BhcnQuanMiXSwibmFtZXMiOlsiT0xFIiwiUGFydCIsIm5hbWUiLCJkb2MiLCJmb2xkZXIiLCJyZWxOYW1lIiwiaSIsImxhc3RJbmRleE9mIiwic3Vic3RyaW5nIiwicGFydHMiLCJPYmplY3QiLCJkZWZpbmVQcm9wZXJ0eSIsImdldCIsImdldE9iamVjdFBhcnQiLCJfaW5pdCIsImNvbmZpZ3VyYWJsZSIsInBhdGgiLCJzdGFydHNXaXRoIiwic3Vic3RyIiwiaWQiLCJyZWwiLCJyZWxzIiwidGFyZ2V0IiwiYXR0ciIsIm5vcm1hbGl6ZVBhdGgiLCJ0eXBlIiwidXJsIiwic3BsaXQiLCJwb3AiLCJnZXREYXRhUGFydEFzVXJsIiwiY3JjMzIiLCJnZXRQYXJ0Q3JjMzIiLCJlbmRzV2l0aCIsImdldFJlbE9iamVjdCIsImdldFBhcnQiLCJNYXRoIiwibWF4IiwidG9BcnJheSIsIm1hcCIsInBhcnNlSW50IiwiYSIsImF0dHJpYnMiLCJJZCIsImRhdGEiLCJySWQiLCJfbmV4dHJJZCIsImFwcGVuZCIsInBhcnROYW1lIiwicmF3IiwiZmlsZSIsImV4dCIsIm1pbWUiLCJ0YXJnZXROYW1lIiwidCIsIlRhcmdldCIsIm1hdGNoIiwiRGVmYXVsdFR5cGVzIiwiZXh0VHlwZSIsImZpbmQiLCJsZW5ndGgiLCJwcmVwZW5kIiwicmVsYXRpb25zaGlwVHlwZSIsImNvbnRlbnRUeXBlIiwiY29uc3RydWN0b3IiLCJjb250ZW50VHlwZXMiLCJyaWQiLCJnZXREYXRhUGFydCIsInBhcnNlIiwicmVtb3ZlIiwibm9kZSIsImNyZWF0ZUVsZW1lbnQiLCJwcm9wcyIsImNoaWxkcmVuIiwiaWRlbnRpZnkiLCJleHRyYSIsInRhZ05hbWUiLCJwYXJlbnQiLCJtb2RlbCIsImUiLCJjb250ZW50IiwidW5kZWZpbmVkIiwia2V5IiwiYXNzaWduIiwiY2hpbGRFbGVtZW50cyIsIkFycmF5IiwiaXNBcnJheSIsInJlbmRlck5vZGUiLCJmaWx0ZXIiLCIk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QUlTLGdCQUFjWCxRQUFsQjtBQUNBLE9BQUdZLE1BQU1DLE9BQU4sQ0FBY2IsUUFBZCxDQUFILEVBQTJCO0FBQzFCLFFBQUdBLFNBQVNiLE1BQVosRUFBbUI7QUFDbEJ3QixxQkFBY1gsU0FBU2xDLEdBQVQsQ0FBYTtBQUFBLGFBQUdFLElBQUksTUFBSzhDLFVBQUwsQ0FBZ0I5QyxDQUFoQixFQUFrQjhCLGFBQWxCLEVBQWdDRyxRQUFoQyxDQUFKLEdBQWdELElBQW5EO0FBQUEsTUFBYixFQUFzRWMsTUFBdEUsQ0FBNkU7QUFBQSxhQUFHLENBQUMsQ0FBQy9DLENBQUw7QUFBQSxNQUE3RSxDQUFkO0FBQ0E7QUFDRDs7QUFFRCxVQUFPOEIsY0FDTDdDLElBREssRUFFTDhDLEtBRkssRUFHTFksYUFISyxDQUFQO0FBS0E7OztvQkFFQ2QsSSxFQUFLO0FBQ04sVUFBTyxLQUFLbEUsR0FBTCxDQUFTcUYsQ0FBVCxDQUFXbkIsSUFBWCxDQUFQO0FBQ0E7Ozs7OztrQkE1Tm1CcEUsSSIsImZpbGUiOiJwYXJ0LmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgT0xFIGZyb20gXCIuL29sZVwiXG5cbi8qKlxuICogbmFtZTogQUJTT0xVVEUgcGF0aCBvZiBhIHBhcnQsIHdvcmQueG1sLCBwcHQvc2xpZGVzL3NsaWRlMS54bWxcbiAqIGZvbGRlcjphYnNvbHV0ZSBmb2xkZXIsIGVuZHMgd2l0aCBcIi9cIiBvciB0b3RhbGx5IGVtcHR5IFwiXCJcbiAqIHJlbE5hbWU6YWJzb2x1dGUgcGF0aCBvZiBhIHJlbGF0aW9uc2hpcCBwYXJ0XG4gKi9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFBhcnR7XG5cdGNvbnN0cnVjdG9yKG5hbWUsZG9jKXtcblx0XHR0aGlzLm5hbWU9bmFtZVxuXHRcdHRoaXMuZG9jPWRvY1xuXG5cdFx0bGV0IGZvbGRlcj1cIlwiXG5cdFx0bGV0IHJlbE5hbWU9XCJfcmVscy9cIituYW1lK1wiLnJlbHNcIlxuXHRcdGxldCBpPW5hbWUubGFzdEluZGV4T2YoJy8nKVxuXG5cdFx0aWYoaSE9PS0xKXtcblx0XHRcdGZvbGRlcj1uYW1lLnN1YnN0cmluZygwLGkrMSlcblx0XHRcdHJlbE5hbWU9Zm9sZGVyK1wiX3JlbHMvXCIrbmFtZS5zdWJzdHJpbmcoaSsxKStcIi5yZWxzXCI7XG5cdFx0fVxuXG5cdFx0aWYoZG9jLnBhcnRzW3JlbE5hbWVdKXtcblx0XHRcdHRoaXMuZm9sZGVyPWZvbGRlclxuXHRcdFx0dGhpcy5yZWxOYW1lPXJlbE5hbWVcblx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLFwicmVsc1wiLHtcblx0XHRcdFx0Z2V0KCl7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuZG9jLmdldE9iamVjdFBhcnQodGhpcy5yZWxOYW1lKVxuXHRcdFx0XHR9XG5cdFx0XHR9KVxuXHRcdH1cblx0XHR0aGlzLl9pbml0KClcblx0fVxuXG5cdF9pbml0KCl7XG5cdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsXCJjb250ZW50XCIse1xuXHRcdFx0Y29uZmlndXJhYmxlOnRydWUsXG5cdFx0XHRnZXQoKXtcblx0XHRcdFx0cmV0dXJuIHRoaXMuZG9jLmdldE9iamVjdFBhcnQodGhpcy5uYW1lKVxuXHRcdFx0fVxuXHRcdH0pXG5cdH1cblxuXHRub3JtYWxpemVQYXRoKHBhdGg9XCJcIil7XG5cdFx0aWYocGF0aC5zdGFydHNXaXRoKFwiL1wiKSlcblx0XHRcdHJldHVybiBwYXRoLnN1YnN0cigxKVxuXHRcdHJldHVybiB0aGlzLmZvbGRlcitwYXRoXG5cdH1cblxuXHRnZXRSZWxQYXJ0KGlkKXtcblx0XHR2YXIgcmVsPXRoaXMucmVscyhgUmVsYXRpb25zaGlwW0lkPVwiJHtpZH1cIl1gKVxuXHRcdHZhciB0YXJnZXQ9cmVsLmF0dHIoXCJUYXJnZXRcIilcblx0XHRyZXR1cm4gbmV3IFBhcnQodGhpcy5ub3JtYWxpemVQYXRoKHRhcmdldCksdGhpcy5kb2MpXG5cdH1cblxuXHRnZXRSZWxUYXJnZXQodHlwZSl7XG5cdFx0cmV0dXJuIHRoaXMucmVscyhgW1R5cGUkPVwiJHt0eXBlfVwiXWApLmF0dHIoXCJUYXJnZXRcIilcblx0fVxuXG5cdGdldFJlbE9iamVjdCh0YXJnZXQpe1xuXHRcdHJldHVybiB0aGlzLmRvYy5nZXRPYmplY3RQYXJ0KHRoaXMubm9ybWFsaXplUGF0aCh0YXJnZXQpKVxuXHR9XG5cblx0Z2V0UmVsKGlkKXtcblx0XHR2YXIgcmVsPXRoaXMucmVscyhgUmVsYXRpb25zaGlwW0lkPVwiJHtpZH1cIl1gKVxuXHRcdHZhciB0YXJnZXQ9cmVsLmF0dHIoXCJUYXJnZXRcIilcblx0XHRpZihyZWwuYXR0cihcIlRhcmdldE1vZGVcIik9PT0nRXh0ZXJuYWwnKVxuXHRcdFx0cmV0dXJuIHt1cmw6dGFyZ2V0fVxuXG5cdFx0c3dpdGNoKHJlbC5hdHRyKFwiVHlwZVwiKS5zcGxpdChcIi9cIikucG9wKCkpe1xuXHRcdGNhc2UgJ2ltYWdlJzpcblx0XHRcdGxldCB1cmw9dGhpcy5kb2MuZ2V0RGF0YVBhcnRBc1VybCh0aGlzLm5vcm1hbGl6ZVBhdGgodGFyZ2V0KSwgXCJpbWFnZS8qXCIpXG5cdFx0XHRsZXQgY3JjMzI9dGhpcy5kb2MuZ2V0UGFydENyYzMyKHRoaXMubm9ybWFsaXplUGF0aCh0YXJnZXQpKVxuXHRcdFx0cmV0dXJuIHt1cmwsY3JjMzJ9XG5cdFx0ZGVmYXVsdDpcblx0XHRcdGlmKHRhcmdldC5lbmRzV2l0aChcIi54bWxcIikpXG5cdFx0XHRcdHJldHVybiB0aGlzLmdldFJlbE9iamVjdCh0YXJnZXQpXG5cdFx0XHRlbHNlXG5cdFx0XHRcdHJldHVybiB0aGlzLmRvYy5nZXRQYXJ0KHRoaXMubm9ybWFsaXplUGF0aCh0YXJnZXQpKVxuXHRcdH1cblx0fVxuXG5cdF9uZXh0cklkKCl7XG5cdFx0cmV0dXJuIE1hdGgubWF4KC4uLnRoaXMucmVscygnUmVsYXRpb25zaGlwJykudG9BcnJheSgpLm1hcChhPT5wYXJzZUludChhLmF0dHJpYnMuSWQuc3Vic3RyaW5nKDMpKSkpKzFcblx0fVxuXG5cdGFkZCh0eXBlLHRhcmdldCxkYXRhKXtcblx0XHRjb25zdCBySWQ9YHJJZCR7dGhpcy5fbmV4dHJJZCgpfWBcblx0XHR0aGlzLnJlbHMoXCJSZWxhdGlvbnNoaXBzXCIpXG5cdFx0XHQuYXBwZW5kKGA8UmVsYXRpb25zaGlwIElkPVwiJHtySWR9XCIgdHlwZT1cIiR7dHlwZX1cIiB0YXJnZXQ9XCIke3RhcmdldH1cIi8+YClcblx0XHRjb25zdCBwYXJ0TmFtZT10aGlzLm5vcm1hbGl6ZVBhdGgodGFyZ2V0KVxuXHRcdHRoaXMuZG9jLnJhdy5maWxlKHBhcnROYW1lLCBkYXRhKVxuXHRcdHRoaXMuZG9jLnBhcnRzW3BhcnROYW1lXT10aGlzLmRvYy5yYXcuZmlsZShwYXJ0TmFtZSlcblx0XHRyZXR1cm4gcklkXG5cdH1cblxuXHRhZGRJbWFnZShkYXRhLCB7ZXh0LG1pbWV9PXtleHQ6XCJqcGdcIixtaW1lOlwiaW1hZ2UvanBnXCJ9KXtcblx0XHRjb25zdCB0eXBlPVwiaHR0cDovL3NjaGVtYXMub3BlbnhtbGZvcm1hdHMub3JnL29mZmljZURvY3VtZW50LzIwMDYvcmVsYXRpb25zaGlwcy9pbWFnZVwiXG5cdFx0bGV0IGlkPWBySWQke3RoaXMuX25leHRySWQoKX1gXG5cblx0XHRsZXQgdGFyZ2V0TmFtZT1cIm1lZGlhL2ltYWdlXCIrKE1hdGgubWF4KDAsLi4udGhpcy5yZWxzKFwiUmVsYXRpb25zaGlwW1R5cGUkPSdpbWFnZSddXCIpLnRvQXJyYXkoKS5tYXAodD0+e1xuXHRcdFx0cmV0dXJuIHBhcnNlSW50KHQuYXR0cmlicy5UYXJnZXQubWF0Y2goL1xcZCtcXC4vKXx8WzBdKVxuXHRcdH0pKSsxKStcIi5cIitleHQ7XG5cblx0XHRsZXQgcGFydE5hbWU9dGhpcy5ub3JtYWxpemVQYXRoKHRhcmdldE5hbWUpXG5cdFx0dGhpcy5kb2MucmF3LmZpbGUocGFydE5hbWUsIGRhdGEpXG5cdFx0dGhpcy5kb2MucGFydHNbcGFydE5hbWVdPXRoaXMuZG9jLnJhdy5maWxlKHBhcnROYW1lKVxuXG5cdFx0dGhpcy5yZWxzKFwiUmVsYXRpb25zaGlwc1wiKVxuXHRcdFx0LmFwcGVuZChgPFJlbGF0aW9uc2hpcCBJZD1cIiR7aWR9XCIgVHlwZT1cIiR7dHlwZX1cIiBUYXJnZXQ9XCIke3RhcmdldE5hbWV9XCIvPmApXG5cblx0XHRjb25zdCBEZWZhdWx0VHlwZXM9dGhpcy5kb2MuZ2V0T2JqZWN0UGFydChcIltDb250ZW50X1R5cGVzXS54bWxcIikoYFR5cGVzYClcblx0XHRjb25zdCBleHRUeXBlPURlZmF1bHRUeXBlcy5maW5kKGA+RGVmYXVsdFtFeHRlbnNpb249JyR7ZXh0fSddYClcblx0XHRpZihleHRUeXBlLmxlbmd0aD09MCl7XG5cdFx0XHREZWZhdWx0VHlwZXMucHJlcGVuZChgPERlZmF1bHQgRXh0ZW5zaW9uPVwiJHtleHR9XCIgQ29udGVudFR5cGU9XCIke21pbWV9XCIvPmApXG5cdFx0fVxuXHRcdHJldHVybiBpZFxuXHR9XG5cblx0YWRkRXh0ZXJuYWxJbWFnZSh1cmwpe1xuXHRcdGNvbnN0IHR5cGU9XCJodHRwOi8vc2NoZW1hcy5vcGVueG1sZm9ybWF0cy5vcmcvb2ZmaWNlRG9jdW1lbnQvMjAwNi9yZWxhdGlvbnNoaXBzL2ltYWdlXCJcblxuXHRcdGxldCBpZD1gcklkJHt0aGlzLl9uZXh0cklkKCl9YFxuXG5cdFx0dGhpcy5yZWxzKFwiUmVsYXRpb25zaGlwc1wiKVxuXHRcdFx0LmFwcGVuZChgPFJlbGF0aW9uc2hpcCBJZD1cIiR7aWR9XCIgVHlwZT1cIiR7dHlwZX1cIiBUYXJnZXRNb2RlPVwiRXh0ZXJuYWxcIiBUYXJnZXQ9XCIke3VybH1cIi8+YClcblxuXHRcdHJldHVybiBpZFxuXHR9XG5cblx0YWRkQ2h1bmsoZGF0YSwgcmVsYXRpb25zaGlwVHlwZSwgY29udGVudFR5cGUsIGV4dCl7XG5cdFx0cmVsYXRpb25zaGlwVHlwZT1yZWxhdGlvbnNoaXBUeXBlfHxcImh0dHA6Ly9zY2hlbWFzLm9wZW54bWxmb3JtYXRzLm9yZy9vZmZpY2VEb2N1bWVudC8yMDA2L3JlbGF0aW9uc2hpcHMvYUZDaHVua1wiXG5cdFx0Y29udGVudFR5cGU9Y29udGVudFR5cGV8fHRoaXMuZG9jLmNvbnN0cnVjdG9yLm1pbWVcblx0XHRleHQ9ZXh0fHx0aGlzLmRvYy5jb25zdHJ1Y3Rvci5leHRcblxuXHRcdGxldCBpZD10aGlzLl9uZXh0cklkKClcblx0XHRsZXQgcklkPWBySWQke2lkfWBcblx0XHRsZXQgdGFyZ2V0TmFtZT1gY2h1bmsvY2h1bmske2lkfS4ke2V4dH1gXG5cblx0XHRsZXQgcGFydE5hbWU9dGhpcy5ub3JtYWxpemVQYXRoKHRhcmdldE5hbWUpXG5cdFx0dGhpcy5kb2MucmF3LmZpbGUocGFydE5hbWUsIGRhdGEpXG5cdFx0dGhpcy5kb2MucGFydHNbcGFydE5hbWVdPXRoaXMuZG9jLnJhdy5maWxlKHBhcnROYW1lKVxuXG5cdFx0dGhpcy5yZWxzKFwiUmVsYXRpb25zaGlwc1wiKVxuXHRcdFx0LmFwcGVuZChgPFJlbGF0aW9uc2hpcCBJZD1cIiR7cklkfVwiIFR5cGU9XCIke3JlbGF0aW9uc2hpcFR5cGV9XCIgVGFyZ2V0PVwiJHt0YXJnZXROYW1lfVwiLz5gKVxuXG5cdFx0dGhpcy5kb2MuY29udGVudFR5cGVzXG5cdFx0XHQuYXBwZW5kKGA8T3ZlcnJpZGUgUGFydE5hbWU9XCIvJHtwYXJ0TmFtZX1cIiBDb250ZW50VHlwZT1cIiR7Y29udGVudFR5cGV9XCIvPmApXG5cblx0XHRyZXR1cm4gcklkXG5cdH1cblxuXHRnZXRSZWxPbGVPYmplY3QocmlkKXtcblx0XHRsZXQgcmVsPXRoaXMucmVscyhgUmVsYXRpb25zaGlwW0lkPSR7cmlkfV1gKVxuXHRcdGxldCB0eXBlPXJlbC5hdHRyKFwiVHlwZVwiKVxuXHRcdGxldCB0YXJnZXROYW1lPXJlbC5hdHRyKFwiVGFyZ2V0XCIpXG5cdFx0bGV0IGRhdGE9dGhpcy5kb2MuZ2V0RGF0YVBhcnQodGhpcy5ub3JtYWxpemVQYXRoKHRhcmdldE5hbWUpKVxuXHRcdHN3aXRjaCh0eXBlLnNwbGl0KFwiL1wiKS5wb3AoKSl7XG5cdFx0XHRjYXNlIFwib2xlT2JqZWN0XCI6XG5cdFx0XHRcdHJldHVybiBPTEUucGFyc2UoZGF0YSlcblx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdHJldHVybiBkYXRhXG5cdFx0fVxuXG5cdH1cblxuXHRyZW1vdmVSZWwoaWQpe1xuXHRcdGxldCByZWw9dGhpcy5yZWxzKGBSZWxhdGlvbnNoaXBbSWQ9XCIke2lkfVwiXWApXG5cdFx0aWYocmVsLmF0dHIoXCJUYXJnZXRNb2RlXCIpIT09XCJFeHRlcm5hbFwiKXtcblx0XHRcdGxldCBwYXJ0TmFtZT10aGlzLm5vcm1hbGl6ZVBhdGgocmVsLmF0dHIoXCJUYXJnZXRcIikpXG5cdFx0XHR0aGlzLmRvYy5jb250ZW50VHlwZXMuZmluZChgW1BhcnROYW1lPScvJHtwYXJ0TmFtZX0nXWApLnJlbW92ZSgpXG5cdFx0XHR0aGlzLmRvYy5yYXcucmVtb3ZlKHBhcnROYW1lKVxuXHRcdFx0ZGVsZXRlIHRoaXMuZG9jLnBhcnRzW3BhcnROYW1lXVxuXHRcdH1cblx0XHRyZWwucmVtb3ZlKClcblx0fVxuXG5cdHJlbmRlck5vZGUobm9kZSwgY3JlYXRlRWxlbWVudD0odHlwZSxwcm9wcyxjaGlsZHJlbik9Pnt0eXBlLHByb3BzLGNoaWxkcmVufSxpZGVudGlmeT1ub2RlPT5ub2RlLm5hbWUuc3BsaXQoXCI6XCIpLnBvcCgpLCBleHRyYSl7XG5cdFx0bGV0IHtuYW1lOnRhZ05hbWUsIGNoaWxkcmVuLGlkLCBwYXJlbnR9PW5vZGVcblx0XHRpZihub2RlLnR5cGU9PVwidGV4dFwiKXtcblx0XHRcdHJldHVybiBub2RlLmRhdGFcblx0XHR9XG5cblx0XHRsZXQgdHlwZT10YWdOYW1lXG5cdFx0bGV0IHByb3BzPXt9XG5cblx0XHRpZihpZGVudGlmeSl7XG4gICAgICAgICAgICAgICAgICAgICAgIGxldCBtb2RlbD1udWxsO1xuICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgIG1vZGVsID0gaWRlbnRpZnkobm9kZSx0aGlzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgLy8gaWdub3JlIG5vZGVzIHRoYXQgY2FuJ3QgYmUgaWRlbnRpZmllZFxuICAgICAgICAgICAgICAgICAgICAgICB9XG5cdFx0XHRpZighbW9kZWwpXG5cdFx0XHRcdHJldHVybiBudWxsXG5cblx0XHRcdGlmKHR5cGVvZihtb2RlbCk9PVwic3RyaW5nXCIpe1xuXHRcdFx0XHR0eXBlPW1vZGVsXG5cdFx0XHR9ZWxzZXtcblx0XHRcdFx0bGV0IGNvbnRlbnQ7XG5cdFx0XHRcdCh7dHlwZSwgY2hpbGRyZW46Y29udGVudCwgLi4ucHJvcHN9PW1vZGVsKTtcblx0XHRcdFx0aWYoY29udGVudCE9PXVuZGVmaW5lZClcblx0XHRcdFx0XHRjaGlsZHJlbj1jb250ZW50XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHByb3BzLmtleT1pZFxuXHRcdHByb3BzLm5vZGU9bm9kZVxuXHRcdHByb3BzLnR5cGU9dHlwZVxuXG5cdFx0aWYoZXh0cmEpXG5cdFx0XHRPYmplY3QuYXNzaWduKHByb3BzLGV4dHJhKVxuXG5cdFx0bGV0IGNoaWxkRWxlbWVudHM9Y2hpbGRyZW5cblx0XHRpZihBcnJheS5pc0FycmF5KGNoaWxkcmVuKSl7XG5cdFx0XHRpZihjaGlsZHJlbi5sZW5ndGgpe1xuXHRcdFx0XHRjaGlsZEVsZW1lbnRzPWNoaWxkcmVuLm1hcChhPT5hID8gdGhpcy5yZW5kZXJOb2RlKGEsY3JlYXRlRWxlbWVudCxpZGVudGlmeSkgOiBudWxsKS5maWx0ZXIoYT0+ISFhKVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiBjcmVhdGVFbGVtZW50KFxuXHRcdFx0XHR0eXBlLFxuXHRcdFx0XHRwcm9wcyxcblx0XHRcdFx0Y2hpbGRFbGVtZW50c1xuXHRcdFx0KVxuXHR9XG5cblx0JChub2RlKXtcblx0XHRyZXR1cm4gdGhpcy5kb2MuJChub2RlKVxuXHR9XG59XG4iXX0=