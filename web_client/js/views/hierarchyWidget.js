/**
 * A bootstrap list-group style view with paging support.
 */
histomicstk.views.ListView = girder.View.extend({
});

/**
 * Describes an item displayed in the list view.  Must be
 * initialized with a girder ID, model type, and parent ListModel object.
 *
 * @example
 *  new ListModel({id: 'deadbeef', type: 'folder', parent: myParent})
 *
 * When instantiated with no arguments, a new root node will be constructed.
 * The "root" node will contain 3 children:
 *   * home:        Folders under the current user's model
 *   * users:       Other users
 *   * collections: Folders inside girder collections
 */
histomicstk.models.ListModel = Backbone.Model.extend({
    defaults: {
        // The attributes are readonly after construction
        id: null,         // girder object id
        type: null,       // girder model of the actual item
        parent: null,     // the parent object or null to indicate it should be
                          // treated as the root

        // The model takes care of loading the following properties at initialization
        name: '',         // main descriptive text left-aligned
        thumbnail: null,  // URI to a thumbnail image to display right of the item

        // display parameters that will be determined from the object type and metadata
        right: null,      // right-aligned text
        badge: null,      // text to display in a bootstrap badge
        tooltip: null,    // text to display in a tooltip on hover
        icon: null,       // A fontello icon class to display in place of a thumbnail

        // these resources will be loaded on demand
        meta: null,       // associated metadata displayable in a subview
        children: null    // a ListCollection of children that can be fetched on demand
    },

    initialize: function (attrs) {
        attrs = attrs || {};

        if (!attrs.type) { // default root
            name
        }
    },

    /**
     * Load attributes from girder rest calls... dispatches to
     * the correct method according to the model type.
     */
    _girderSync: function () {
        var defer;

        switch(this.get('type')) {
            case 'user':
                defer = this._girderSyncUser();
                break;
            case 'item':
                defer = this._girderSyncItem();
                break;
            case 'collection':
                defer = this._girderSyncCollection();
                break;
            case 'users':
                defer = this._girderSyncUsers();
                break;
            case 'collections':
                defer = this._girderSyncCollections();
                break;
            default: // return a rejected promise
                defer = new $.Deferred().reject('Invalid model type').promise();
        }
        return defer.then(
            _.bind(function () {
                this.trigger('g:loaded', this);
            }, this),
            _.bind(function (err) {
                this.trigger('g:invalid', this, err);
            }, this)
        );
    },

    _girderSyncUser: function () {
        return girder.restRequest({
            path: 'user/' + this.id
        }).then(_.bind(this.setUser, this));
    },

    /**
     * Set model data from a girder user object.
     */
    setUser: function (user) {
        this.set({
            name: user.lastName + ', ' + user.firstName,
            tooltip: user.login,
            icon: 'icon-user'
        });
    }
});

/**
 * Describes a collection items displayed in the list view.
 */
histomicstk.collections.ListCollection = Backbone.Collection.extend({
    model: histomicstk.models.ListModel,
    localStorage: new Backbone.LocalStorage('HistomicsTK-List-Collection')
});

/**
 * This widget is used to navigate the data hierarchy of folders and items.
 */
histomicstk.views.HierarchyWidget = girder.View.extend({
    events: {
    },

    initialize: function (settings) {
        this.root = settings.root;
        this.items = [];
        this.folders = [];
    }

});
