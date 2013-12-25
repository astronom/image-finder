/**
 * Created by astronom on 23.12.13.
 *
 * Flickr API
 * Based on the work of Ryan Heath (http://rpheath.com)
 * ----------------------------------------------------
 */

(function (window) {
	"use strict";

	function Initclass(j) {
		if (typeof j !== 'object') {
			throw new Error('j was expected to be an object, ' + (typeof j + ' was received.'));
		}

		var data = (j.data !== undefined) ? j.data : {};
		var defaults = (j.defaults !== undefined) ? j.defaults : {};
		var synonyms = (j.synonyms !== undefined) ? j.synonyms : {};

		for (var k in synonyms) {
			if (data[k] !== undefined) {
				data[ synonyms[k] ] = data[k];
			}
		}

		var types = {};
		for (var llave in defaults) {
			types[llave] = typeof defaults[llave];
		}

		for (var key in defaults) {
			data[key] = (typeof data[key] === 'undefined') ? defaults[key] : data[key];
		}

		for (var key in data) {
			var t = typeof data[key];
			if (t !== types[key] && types[k] !== undefined) {
				throw new Error('Error : ' + key + ' was expected to be ' + types[key] + ', but was received: ' + t);
			} else {
				this[key] = data[key];
			}
		}
	}

	var Flickr = function (j) {

		var defaults = {
			api_key: 'YOUR API KEY',		// Api key
			thumbnail_size: 'sq',			// Размер превью
			image_size: 'm',				// Размер изображния для показа
			minWidth: false,					// Минимальная ширина для оригинального изображения
			minHeight: false					// Минимальная высота оригинального изображения
		};

		var js = {data: j, defaults: defaults};

		Initclass.call(this, js);
	};

	Flickr.prototype.build_url = function (method, params) {
		var params_t = '';
		if (Object.keys(params).length > 0) {
			params_t = '&' + $.param(params);
		}
		return 'http://api.flickr.com/services/rest/?method=' + method + '&format=json' + '&api_key=' + this.api_key + params_t + '&jsoncallback=?';
	};

	Flickr.prototype.translate = function (size) {
		switch (size) {
			case 'sq' :
				return '_s'; // squre
			case 't'  :
				return '_t'; // thumbnail
			case 's'  :
				return '_m'; // small
			case 'm'  :
				return   ''; // medium
			default   :
				return   '';
		}
	};

	Flickr.prototype.thumbnail_src = function (j, size) {
		j.size = this.translate(size);
		return 'http://farm' + j.farm + '.static.flickr.com/' + j.server + '/' + j.id + '_' + j.secret + j.size + '.jpg';
	};

	Flickr.prototype.original_src = function (j) {
		return 'http://farm' + j.farm + '.static.flickr.com/' + j.server + '/' + j.id + '_' + j.originalsecret + '_o.' + j.originalformat;
	};

	Flickr.prototype.request = function (method, options, callback) {
		var url = this.build_url(method, options);
		$.getJSON(url, function (data) {
			if (data.stat && data.stat === 'ok')
				callback(data);
			else {
				// Обработка ошибок
				console.log('Error ' + data.code + ' ' + data.message);
			}
		});
	};

	Flickr.prototype.photos = function (method, options, callback) {

		var gallery = [],
			photos = [],
			t = this;

		this.request(method, options, function (data) {

			if (data.photo)
				photos = data.photo;
			else
				photos = data.photos ? data.photos.photo : data.photoset.photo;

			if (t.minHeight || t.minWidth)
				photos = t.filterByDim(photos);

			photos.forEach(function (e) {
				gallery.push({
					thumb_url: t.thumbnail_src(e, t.thumbnail_size),
					image_url: t.thumbnail_src(e, t.image_size),
					original_url: t.original_src(e),
					title: encodeURIComponent(e.title),
					owner_name: e.ownername ? encodeURIComponent(e.ownername) : '',
					owner_contact: ['http://www.flickr.com/messages_write.gne?to=', e.owner].join(''),
					photo_id: e.id,
					photo_link: ['http://flickr.com/photos/', e.owner, e.id].join('/'),
					license: e.license
				});
			});

			callback.call(this, gallery);
		});
	};

	Flickr.prototype.filterByDim = function (photos) {
		var filteredPhotos = [];
		var t = this;
		if (photos.length) {
			photos.forEach(function (e) {
				if (t.minWidth && t.minHeight) {
					if (e.o_width && e.o_width >= t.minWidth
							&& e.o_height && e.o_height >= t.minHeight)
						filteredPhotos.push(e);
				}
				else if (t.minWidth) {
					if (e.o_width && e.o_width >= t.minWidth)
						filteredPhotos.push(e);
				}
				else if (e.o_height && e.o_height >= t.minHeight)
					filteredPhotos.push(e);
			});
		}
		return filteredPhotos;
	};

	// http://www.flickr.com/services/api/flickr.photos.search.html
	Flickr.prototype.photosSearch = function (options, callback) {
		this.photos('flickr.photos.search', options, callback);
	};

	// http://www.flickr.com/services/api/flickr.photos.getInfo.html
	Flickr.prototype.photoInfo = function (options, callback) {
		this.request('flickr.photos.getInfo', options, function (data) {
			var photoInfo = {};

			photoInfo.title = data.photo.title._content ? data.photo.title._content : '';
			photoInfo.description = data.photo.description._content ? encodeURIComponent(data.photo.description._content) : '';
			photoInfo.owner_name = data.photo.owner.realname ? data.photo.owner.realname : data.photo.owner.username;
			photoInfo.url = data.photo.urls.url[0]._content;
			photoInfo.tags = data.photo.tags.tag;

			callback.call(this, photoInfo);
		});
	};

	Flickr.prototype.licenseInfo = function (callback) {
		this.request('flickr.photos.licenses.getInfo', {}, function (data) {
			callback(data.licenses.license);
		});
	};

	window.flickr = function (j) {
		return new Flickr(j);
	}
})(window);