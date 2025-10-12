import React from 'react';
import CustomButton from '../common/CustomButton';
import { useTranslation } from 'react-i18next';

export default function RefreshButton({ onPress }) {
  const { t } = useTranslation(); // defaults to 'common' NS now

  return <CustomButton title={t("refresh")} onPress={onPress} />;
}
