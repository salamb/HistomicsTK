/**
 * A bootstrap list-group style view with paging support.
 */
histomicstk.views.ListView = girder.View.extend({
});

/**
 * This is a meta-model that can represent any of the following:
 *
 *   * user ->
 *     * folder[]
 *     * item[]
 *   * folder ->
 *     * folder[]
 *     * item[]
 *   * collection ->
 *     * folder[]
 *   * item ->
 *     * file[]
 *   * file
 *
 * It can also represent a few "pseudo" model types that are static
 * objects displayable in a hierarchy widget but aren't stored
 * explicitly as a model by girder.
 *
 *   * root -> 
 *     * home (alias to logged in user)
 *     * users ->
 *       * user[]
 *     * collections ->
 *       * collection[]
 */
histomicstk.models.HierarchyModel = girder.Model.extend({
    initialize: function (attrs, opts) {
        var triggerAndReturn = _.bind(function (evt) {
            this.trigger(evt);
            return this;
        }, this);
        var save = triggerAndReturn('g:saved');
        var fetch = triggerAndReturn('g:fetched');
        var destroy = triggerAndReturn('g:deleted');


        if (!_.has(opts, 'type')) {
            opts.type = 'root';
        }

        // set the resource name according to the type
        this.resourceName = opts.type;

        // override fetch, destroy, and save methods for pseudo types
        switch(opts.type) {
            case 'users':
            case 'home':
            case 'collections': 
            case 'root':
                this.save = save;
                this.destroy = destroy;
                this.fetch = fetch;
                break;
        }
    },

    /**
     * Return a collection that is bound to fetch children of
     * this model.
     */
    children: function () {
    }
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
        icon: null        // A fontello icon class to display in place of a thumbnail
    },

    initialize: function () {
        this._girderSync();
    },

    /**
     * Load attributes from girder rest calls... dispatches to
     * the correct set* method according to the model type.
     */
    _girderSync: function () {
        var defer = $.when(this);

        switch(this.get('type')) {
            case 'user':
                defer = girder.restRequest({
                    path: 'user/' + this.id
                }).then(_.bind(this.setUser, this));
                break;
            case 'item':
                defer = girder.restRequest({
                    path: 'item/' + this.id
                }).then(_.bind(this.setItem, this));
                break;
            case 'collection':
                defer = girder.restRequest({
                    path: 'collection/' + this.id
                }).then(_.bind(this.setCollection, this));
                break;
            case 'users':
                this.setUsers();
                break;
            case 'collections':
                this.setCollections();
                break;
            case null:
                this.setRoot();
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

    /**
     * Set model data from a girder user object.
     */
    setUser: function (user) {
        this.set({
            name: user.lastName + ', ' + user.firstName,
            tooltip: user.login,
            icon: 'icon-user'
        });
    },

    /**
     * Set model data from a girder item object.
     */
    setItem: function (item) {
        this.set({
            name: item.name,
            tooltip: item.description,
            icon: 'icon-doc-text-inv'
        });
    },

    /**
     * Set model data from a girder collection object.
     */
    setCollection: function (collection) {
        this.set({
            name: collection.name,
            icon: 'icon-box'
        });
    },

    /**
     * Set model data for the psuedo "users" type
     */
    setUsers: function () {
        this.set({
            name: 'Users',
            icon: 'icon-users'
        });
    },

    /**
     * Set model data for the psuedo "collections" type
     */
    setCollections: function () {
        this.set({
            name: 'Collections',
            icon: 'icon-sitemap'
        });
    },

    /**
     * Set model data for the psuedo "root" type
     */
    setRoot: function () {
        this.set({
            name: ''
        });
    }
});

/**
 * Describes a collection items displayed in the list view.
 */
histomicstk.collections.ListCollection = Backbone.Collection.extend({
    model: histomicstk.models.ListModel,
    localStorage: new Backbone.LocalStorage('HistomicsTK-List-Collection'),

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
