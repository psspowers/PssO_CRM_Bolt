export const isContactPickerSupported = (): boolean => {
  return 'contacts' in navigator && 'ContactsManager' in window;
};

export const openNativeContactPicker = async (): Promise<any[]> => {
  try {
    if (!('contacts' in navigator && 'ContactsManager' in window)) {
      alert("Contact Import is not supported on this browser. Try Chrome on Android or Safari on iOS.");
      return [];
    }

    const props = ['name', 'email', 'tel'];

    // @ts-ignore
    const contacts = await navigator.contacts.select(props, { multiple: false });

    return contacts;

  } catch (err: any) {
    console.error("Contact picker error:", err);

    if (!err.message?.includes('cancelled')) {
       alert("Could not open contacts: " + err.message);
    }
    return [];
  }
};

export const mapNativeToCRM = (nativeContact: any) => ({
  fullName: ((nativeContact.name?.[0] || '') + ' ' + (nativeContact.name?.[1] || '')).trim() || nativeContact.name?.[0] || '',
  email: nativeContact.email?.[0] || '',
  phone: nativeContact.tel?.[0] || '',
  role: '',
});
