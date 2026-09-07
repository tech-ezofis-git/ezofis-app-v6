/**
 * EZOFIS Widget SDK & Web Component v1.6.0
 * Enables embedding of EZOFIS Folders, Workflows/Requests, and Dashboard as an interactive widget.
 * Features standard 48px widget launcher button with sharp 20px vector SVG icons.
 */

(function (window, document) {
  'use strict';

  var DEFAULT_BASE_URL = (function () {
    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].src;
      if (src && src.indexOf('ezofis-widget.js') !== -1) {
        var url = new URL(src);
        return url.origin;
      }
    }
    return window.location.origin;
  })();

  function buildEmbedUrl(baseUrl, page, email, options) {
    options = options || {};
    page = page || 'folders';
    var cleanBase = (baseUrl || DEFAULT_BASE_URL).replace(/\/$/, '');
    var params = new URLSearchParams();
    if (email) params.set('email', email);
    if (options.sessionToken) params.set('session', options.sessionToken);
    if (options.topbar === false) params.set('topbar', 'false');
    if (options.theme) params.set('theme', options.theme);
    if (options.view || options.viewMode) params.set('view', options.view || options.viewMode);
    if (options.filters) {
      var filtersStr = typeof options.filters === 'object' ? JSON.stringify(options.filters) : options.filters;
      params.set('filters', filtersStr);
    }

    var queryString = params.toString();
    return cleanBase + '/embed/' + page + (queryString ? '?' + queryString : '');
  }

  function getPageSvgIcon(page) {
    if (page === 'requests' || page === 'workflows') {
      return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polyline></svg>';
    } else if (page === 'dashboard') {
      return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>';
    } else {
      // Folders icon
      return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>';
    }
  }

  var EzofisWidget = {
    version: '1.6.0',

    init: function (config) {
      config = config || {};
      var page = config.page || 'folders';
      var email = config.email || '';
      var mode = config.mode || 'inline';
      var baseUrl = config.baseUrl || DEFAULT_BASE_URL;

      if (mode === 'floating') {
        return this.createFloatingWidget(page, email, baseUrl, config);
      } else {
        var targetEl = typeof config.target === 'string' ? document.querySelector(config.target) : config.target;
        if (!targetEl) {
          console.error('[EZOFISWidget] Target element not found:', config.target);
          return null;
        }
        return this.createInlineWidget(targetEl, page, email, baseUrl, config);
      }
    },

    createInlineWidget: function (container, page, email, baseUrl, options) {
      options = options || {};
      var currentEmail = email;
      var currentPage = page;

      var iframe = document.createElement('iframe');
      iframe.src = buildEmbedUrl(baseUrl, currentPage, currentEmail, options);
      iframe.style.width = options.width || '100%';
      iframe.style.height = options.height || '650px';
      iframe.style.border = 'none';
      iframe.style.borderRadius = options.borderRadius || '12px';
      iframe.style.boxShadow = options.boxShadow || '0 4px 16px rgba(15, 23, 42, 0.08)';
      iframe.allow = 'clipboard-read; clipboard-write; camera; microphone';
      iframe.setAttribute('title', 'EZOFIS ' + currentPage + ' Widget');

      container.innerHTML = '';
      container.appendChild(iframe);

      return {
        iframe: iframe,
        updateUser: function (newEmail) {
          currentEmail = newEmail;
          iframe.src = buildEmbedUrl(baseUrl, currentPage, currentEmail, options);
        },
        switchPage: function (newPage) {
          currentPage = newPage;
          iframe.src = buildEmbedUrl(baseUrl, currentPage, currentEmail, options);
        },
        destroy: function () {
          if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        }
      };
    },

    createFloatingWidget: function (page, email, baseUrl, options) {
      options = options || {};
      var currentEmail = email;
      var currentPage = page;
      var cleanBase = (baseUrl || DEFAULT_BASE_URL).replace(/\/$/, '');

      var wrapperId = 'ezofis-floating-widget-wrapper';
      var existingWrapper = document.getElementById(wrapperId);

      if (existingWrapper && existingWrapper._instance) {
        existingWrapper._instance.switchPage(currentPage);
        existingWrapper._instance.updateUser(currentEmail);
        return existingWrapper._instance;
      }

      var wrapper = document.createElement('div');
      wrapper.id = wrapperId;
      wrapper.style.position = 'fixed';
      wrapper.style.bottom = options.bottom || '20px';
      wrapper.style.right = options.right || '20px';
      wrapper.style.zIndex = '999999';
      wrapper.style.fontFamily = "'Inter', system-ui, -apple-system, sans-serif";

      // Standard Modern Floating Widget Trigger (48px circle)
      var button = document.createElement('button');
      button.style.width = '48px';
      button.style.height = '48px';
      button.style.borderRadius = '50%';
      button.style.backgroundColor = options.brandColor || '#7c5cff';
      button.style.color = '#ffffff';
      button.style.border = 'none';
      button.style.outline = 'none';
      button.style.boxShadow = '0 4px 12px 0 rgba(124, 92, 255, 0.35), 0 2px 4px 0 rgba(15, 23, 42, 0.1)';
      button.style.cursor = 'pointer';
      button.style.display = 'flex';
      button.style.alignItems = 'center';
      button.style.justifyContent = 'center';
      button.style.padding = '0';
      button.style.transition = 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease, background-color 0.2s ease';

      var iconWrapper = document.createElement('div');
      iconWrapper.style.display = 'flex';
      iconWrapper.style.alignItems = 'center';
      iconWrapper.style.justifyContent = 'center';
      iconWrapper.style.transition = 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)';
      iconWrapper.innerHTML = getPageSvgIcon(currentPage);

      button.appendChild(iconWrapper);

      var closeIconHtml = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';

      button.onmouseover = function () {
        button.style.transform = 'scale(1.05) translateY(-1px)';
        button.style.boxShadow = '0 6px 16px 0 rgba(124, 92, 255, 0.45), 0 3px 6px 0 rgba(15, 23, 42, 0.12)';
      };
      button.onmouseout = function () {
        button.style.transform = 'scale(1) translateY(0)';
        button.style.boxShadow = '0 4px 12px 0 rgba(124, 92, 255, 0.35), 0 2px 4px 0 rgba(15, 23, 42, 0.1)';
      };
      button.onmousedown = function () {
        button.style.transform = 'scale(0.95)';
      };
      button.onmouseup = function () {
        button.style.transform = 'scale(1.05) translateY(-1px)';
      };

      // Floating Widget Panel Drawer
      var panel = document.createElement('div');
      panel.style.position = 'fixed';
      panel.style.bottom = '80px';
      panel.style.right = '20px';
      panel.style.width = options.panelWidth || '440px';
      panel.style.height = options.panelHeight || '640px';
      panel.style.maxHeight = 'calc(100vh - 100px)';
      panel.style.maxWidth = 'calc(100vw - 32px)';
      panel.style.backgroundColor = '#FFFFFF';
      panel.style.borderRadius = '16px';
      panel.style.boxShadow = '0 20px 40px -10px rgba(15, 23, 42, 0.25)';
      panel.style.display = 'none';
      panel.style.flexDirection = 'column';
      panel.style.overflow = 'hidden';
      panel.style.zIndex = '999999';
      panel.style.border = '1px solid #e6e6ef';

      var isOpen = false;
      var iframeLoaded = false;
      var iframe = null;

      button.onclick = function () {
        isOpen = !isOpen;
        if (isOpen) {
          panel.style.display = 'flex';
          iconWrapper.style.transform = 'rotate(90deg)';
          iconWrapper.innerHTML = closeIconHtml;

          if (!iframeLoaded) {
            iframe = document.createElement('iframe');
            iframe.src = buildEmbedUrl(cleanBase, currentPage, currentEmail, options);
            iframe.style.width = '100%';
            iframe.style.height = '100%';
            iframe.style.border = 'none';
            iframe.allow = 'clipboard-read; clipboard-write; camera; microphone';
            panel.appendChild(iframe);
            iframeLoaded = true;
          }
        } else {
          panel.style.display = 'none';
          iconWrapper.style.transform = 'rotate(0deg)';
          iconWrapper.innerHTML = getPageSvgIcon(currentPage);
        }
      };

      wrapper.appendChild(button);
      document.body.appendChild(wrapper);
      document.body.appendChild(panel);

      var instance = {
        open: function () { if (!isOpen) button.click(); },
        close: function () { if (isOpen) button.click(); },
        toggle: function () { button.click(); },
        updateUser: function (newEmail) {
          currentEmail = newEmail;
          if (iframe) {
            iframe.src = buildEmbedUrl(cleanBase, currentPage, currentEmail, options);
          }
        },
        switchPage: function (newPage) {
          currentPage = newPage;
          if (!isOpen) {
            iconWrapper.innerHTML = getPageSvgIcon(currentPage);
          }
          if (iframe) {
            iframe.src = buildEmbedUrl(cleanBase, currentPage, currentEmail, options);
          }
        },
        destroy: function () {
          if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
          if (panel.parentNode) panel.parentNode.removeChild(panel);
        }
      };

      wrapper._instance = instance;
      return instance;
    }
  };

  // Register Web Component <ezofis-widget>
  if ('customElements' in window && !customElements.get('ezofis-widget')) {
    class EzofisWidgetElement extends HTMLElement {
      static get observedAttributes() {
        return ['email', 'page', 'mode'];
      }

      connectedCallback() {
        this.renderWidget();
      }

      attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) {
          this.renderWidget();
        }
      }

      renderWidget() {
        var page = this.getAttribute('page') || 'folders';
        var email = this.getAttribute('email') || '';
        var mode = this.getAttribute('mode') || 'inline';
        var baseUrl = this.getAttribute('base-url') || DEFAULT_BASE_URL;

        if (this._instance && this._instance.destroy) {
          this._instance.destroy();
        }

        this._instance = EzofisWidget.init({
          page: page,
          email: email,
          mode: mode,
          baseUrl: baseUrl,
          target: this
        });
      }
    }
    customElements.define('ezofis-widget', EzofisWidgetElement);
  }

  window.EZOFISWidget = EzofisWidget;
  window.EzofisWidget = EzofisWidget;
})(window, document);
