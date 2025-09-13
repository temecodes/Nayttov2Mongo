import 'https://cdn.jsdelivr.net/gh/orestbida/cookieconsent@3.1.0/dist/cookieconsent.umd.js';

CookieConsent.run({
  mode: 'opt-in',
  categories: {
    necessary: { enabled: true, readOnly: true },
    analytics: {
      autoClear: {
        cookies: [
          { name: /^_ga/ },
          { name: '_gid' }
        ]
      },
      services: {
        ga: {
          label: 'Google Analytics',
          onAccept: () => console.log('GA accepted'),
          onReject: () => console.log('GA rejected')
        }
      }
    }
  },
  language: {
    default: 'en',
    translations: {
      en: {
        consentModal: {
          title: 'We use cookies',
          description: 'We use cookies to improve your experience.',
          acceptAllBtn: 'Accept all',
          acceptNecessaryBtn: 'Reject all',
          showPreferencesBtn: 'Manage preferences'
        },
        preferencesModal: {
          title: 'Manage cookie preferences',
          acceptAllBtn: 'Accept all',
          acceptNecessaryBtn: 'Reject all',
          savePreferencesBtn: 'Save current selection',
          sections: [
            {
              title: 'Strictly Necessary',
              description: 'Always on — needed for the site to function.',
              linkedCategory: 'necessary'
            },
            {
              title: 'Analytics',
              description: 'Help us improve by collecting anonymous data.',
              linkedCategory: 'analytics'
            }
          ]
        }
      }
    }
  },
  onFirstConsent: ({cookie}) => {
    console.log('First consent:', cookie);

  },
  onConsent: ({cookie}) => {
    if (CookieConsent.acceptedCategory('analytics')) {
      console.log('Analytics enabled');

    } else {
      console.log('Analytics disabled');

    }
  }
});