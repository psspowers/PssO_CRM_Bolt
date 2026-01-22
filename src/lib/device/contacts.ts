export const isContactPickerSupported = (): boolean => {
  return 'contacts' in navigator && 'ContactsManager' in window;
};

export const openNativeContactPicker = async (): Promise<any[]> => {
  try {
    const props = ['name', 'email', 'tel', 'organization'];
    const opts = { multiple: false };
    // @ts-ignore
    const contacts = await navigator.contacts.select(props, opts);
    return contacts;
  } catch (err) {
    console.error("Contact picker error:", err);
    return [];
  }
};

export const mapNativeToCRM = (nativeContact: any) => ({
  fullName: ((nativeContact.name?.[0] || '') + ' ' + (nativeContact.name?.[1] || '')).trim() || nativeContact.name?.[0] || '',
  email: nativeContact.email?.[0] || '',
  phone: nativeContact.tel?.[0] || '',
  role: nativeContact.organization?.[0] || '',
});
