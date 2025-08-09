/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PersistStorage, StorageValue } from "zustand/middleware";

export function createMapStorage<T>(
  key: string
): PersistStorage<any> | undefined {
  return {
    getItem: (name) => {
      const str = localStorage.getItem(name);
      if (!str) return null;
      const existingValue = JSON.parse(str);
      return {
        ...existingValue,
        state: {
          ...existingValue.state,
          [key]: new Map(existingValue.state[key]),
        },
      };
    },
    setItem: (name, newValue: StorageValue<any>) => {
      const mapValue = newValue.state?.[key];
      const serializedMap =
        mapValue instanceof Map ? Array.from(mapValue.entries()) : [];
      const str = JSON.stringify({
        ...newValue,
        state: {
          ...newValue.state,
          [key]: serializedMap,
        },
      });
      localStorage.setItem(name, str);
    },
    removeItem: (name) => localStorage.removeItem(name),
  };
}
