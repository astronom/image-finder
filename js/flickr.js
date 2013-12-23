/**
 * Galleria Flickr Plugin 2012-09-04
 * http://galleria.io
 *
 * Licensed under the MIT license
 * https://raw.github.com/aino/galleria/master/LICENSE
 *
 */

(function($) {

/*global jQuery, window */

/**

    @class
    @constructor

    @example var flickr = new Galleria.Flickr();

    @author http://aino.se

    @requires jQuery
    @requires Galleria

    @param {String} [api_key] Flickr API key to be used, defaults to the Galleria key

    @returns Instance
*/

Flickr = function( api_key, options ) {

    this.api_key = api_key || '2a2ce06c15780ebeb0b706650fc890b2';

    this.options = $.extend({
        max: 30,                       // photos to return
        imageSize: 'original',           // photo size ( thumb,small,medium,big,original )
        thumbSize: 'square',            // thumbnail size ( thumb,small,medium,big,original )
        sort: 'relevance',  // sort option ( date-posted-asc, date-posted-desc, date-taken-asc, date-taken-desc, interestingness-desc, interestingness-asc, relevance )
        description: false,            // set this to true to get description as caption
        complete: function(){},        // callback to be called to render gallery,
		completeInfo: function(){}, 	// callback to be called to render photo info
        backlink: false,                // set this to true if you want to pass a link back to the original image
		minWidth: 1024,					// Минимальная ширина для оригинального изображения
		minHeight: 1024					// Минимальная высота оригинального изображения
    }, options);

};

Flickr.prototype = {

    // bring back the constructor reference

    constructor: Flickr,

	page: 1,

	_lastCall: {},

    /**
        Search for anything at Flickr

        @param {String} phrase The string to search for
        @param {Function} [callback] The callback to be called when the data is ready

        @returns Instance
    */

    search: function( phrase, callback ) {
        return this._find({
            text: phrase
        }, callback || this.options.complete );
    },

    /**
        Search for anything at Flickr by tag

        @param {String} tag The tag(s) to search for
        @param {Function} [callback] The callback to be called when the data is ready

        @returns Instance
    */

    tags: function( tag, callback ) {
        return this._find({
            tags: tag
        }, callback || this.options.complete );
    },

    /**
        Get a user's public photos

        @param {String} username The username as shown in the URL to fetch
        @param {Function} [callback] The callback to be called when the data is ready

        @returns Instance
    */

    user: function( username, callback ) {
        return this._call({
            method: 'flickr.urls.lookupUser',
            url: 'flickr.com/photos/' + username
        }, function( data ) {
            this._find({
                user_id: data.user.id,
                method: 'flickr.people.getPublicPhotos'
            }, callback);
        });
    },

    /**
        Get photos from a photoset by ID

        @param {String|Number} photoset_id The photoset id to fetch
        @param {Function} [callback] The callback to be called when the data is ready

        @returns Instance
    */

    set: function( photoset_id, callback ) {
        return this._find({
            photoset_id: photoset_id,
            method: 'flickr.photosets.getPhotos'
        }, callback);
    },

    /**
        Get photos from a gallery by ID

        @param {String|Number} gallery_id The gallery id to fetch
        @param {Function} [callback] The callback to be called when the data is ready

        @returns Instance
    */

    gallery: function( gallery_id, callback ) {
        return this._find({
            gallery_id: gallery_id,
            method: 'flickr.galleries.getPhotos'
        }, callback);
    },

    /**
        Search groups and fetch photos from the first group found
        Useful if you know the exact name of a group and want to show the groups photos.

        @param {String} group The group name to search for
        @param {Function} [callback] The callback to be called when the data is ready

        @returns Instance
    */

    groupsearch: function( group, callback ) {
        return this._call({
            text: group,
            method: 'flickr.groups.search'
        }, function( data ) {
            this.group( data.groups.group[0].nsid, callback );
        });
    },

    /**
        Get photos from a group by ID

        @param {String} group_id The group id to fetch
        @param {Function} [callback] The callback to be called when the data is ready

        @returns Instance
    */

    group: function ( group_id, callback ) {
        return this._find({
            group_id: group_id,
            method: 'flickr.groups.pools.getPhotos'
        }, callback );
    },

    /**
        Set flickr options

        @param {Object} options The options object to blend

        @returns Instance
    */

    setOptions: function( options ) {
        $.extend(this.options, options);
        return this;
    },

	photoInfo: function(id) {
		return this._call({
      		photo_id: id,
      		method: 'flickr.photos.getInfo'
  		}, this.options.completeInfo );
	},

    // call Flickr and raise errors

    _call: function( params, callback ) {

        var url = 'http://api.flickr.com/services/rest/?';

        var scope = this;

        params = $.extend({
            format : 'json',
            jsoncallback : '?',
            api_key: this.api_key,
			page: this.page
        }, params );

		this._lastCall = params;

        $.each(params, function( key, value ) {
            url += '&' + key + '=' + value;
        });

		$.getJSON(url, function (data) {
			if (data.stat === 'ok') {
				callback.call(scope, data);
			} else {
				// Обработка ошибок
				//Galleria.raise( data.code.toString() + ' ' + data.stat + ': ' + data.message, true );
				console.log(data.code.toString() + ' ' + data.stat + ': ' + data.message);
			}
		});

        return scope;
    },

	// "hidden" way of getting a big image (~1024) from flickr

    _getBig: function( photo ) {

        if ( photo.url_l ) {
            return photo.url_l;
        } else if ( parseInt( photo.width_o, 10 ) > 1280 ) {

            return 'http://farm'+photo.farm + '.static.flickr.com/'+photo.server +
                '/' + photo.id + '_' + photo.secret + '_b.jpg';
        }

        return photo.url_o || photo.url_z || photo.url_m;

    },

	_getOriginal: function( photo ) {

        if ( !photo.originalsecret ) {
            return this._getBig(photo);
        } else {
            return 'http://farm'+photo.farm + '.static.flickr.com/'+photo.server +
                '/' + photo.id + '_' + photo.originalsecret + '_o.' + photo.originalformat;
        }
    },


    // get image size by option name

    _getSize: function( photo, size ) {

        var img;

        switch(size) {

            case 'thumb':
                img = photo.url_t;
                break;

            case 'square':
                img = photo.url_sq;
                break;

            case 'small':
                img = photo.url_s;
                break;

            case 'big':
                img = this._getBig( photo );
                break;

            case 'original':
                img = photo.url_o ? photo.url_o : this._getBig( photo );
                break;

            default:
                img = photo.url_z || photo.url_m;
                break;
        }
        return img;
    },


    // ask flickr for photos, parse the result and call the callback with the galleria-ready data array

    _find: function( params, callback ) {

        params = $.extend({
            method: 'flickr.photos.search',
            extras: 'url_t,url_m,url_o,url_s,url_sq,url_l,url_z,description,original_format,o_dims,owner_name',
            sort: this.options.sort,
            per_page: Math.min( this.options.max, 500 ),
			license: '4,5,6'
        }, params );

        return this._call( params, function(data) {

            var gallery = [],
				// Отфильтруем изображения по минимальному размеру
                photos = this._filterByDim(data.photos ? data.photos.photo : data.photoset.photo),
                len = photos.length,
                photo,
                i;

            for ( i=0; i<len; i++ ) {

                photo = photos[i];

                gallery.push({
                    thumb: this._getSize( photo, this.options.thumbSize ),
                    image: this._getSize( photo, this.options.imageSize ),
                    big: this._getBig( photo ),
					original: this._getOriginal(photo),
                    title: photos[i].title,
					owner_name: photos[i].owner_name ? photo[i].owner_name : '',
					photo_id: photos[i].id,
					photo_secret: photos[i].secret,
                    description: this.options.description && photos[i].description ? photos[i].description._content : '',
                    link: this.options.backlink ? 'http://flickr.com/photos/' + photo.owner + '/' + photo.id : ''
                });
            }
            callback.call( this, gallery );
        });
    },

	_filterByDim: function(photos) {
		var filteredPhotos = [];
		var _this = this;
		if(photos.length) {
			photos.forEach(function(e) {
				if(e.width_o && e.width_o >= _this.options.minHeight
						&& e.height_o && e.height_o >= _this.options.minHeight)
					filteredPhotos.push(e);
			});
		}
		return filteredPhotos;
	},

	nextPage: function() {
		if(this._lastCall && this._lastCall.page > 0)
		{
			params = this._lastCall;
			params.page++;
			this._find(params, this.options.complete);
		}
	},

	prevPage: function() {
		if(this._lastCall && this._lastCall.page > 1)
		{
			params = this._lastCall;
			params.page--;
			this._find(params, this.options.complete);
		}
	}

};

}( jQuery ) );